import { Router, Request, Response, NextFunction } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import { Payment } from "../models/payment.model";
import { mongoose } from "@pharmacy-saas/db";
import { publishEvent } from "@pharmacy-saas/rabbitmq";
import {
  BadRequestError,
  EVENTS,
  PLAN_LIMITS,
  PERMISSIONS,
} from "@pharmacy-saas/shared";
import { extractUser, requirePermission } from "../middleware/permissions";

export const paymentRoutes = Router();

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID || "";
const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD || "";
const IS_SANDBOX = process.env.SSLCOMMERZ_IS_SANDBOX === "true";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:4000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Direct tenant subscription update (same DB, avoids RabbitMQ race condition)
async function activateTenantSubscription(
  tenantId: string,
  planId: string,
  validTo: Date,
) {
  const db = mongoose.connection.db;
  if (!db) return;
  await db.collection("tenants").updateOne(
    { _id: new mongoose.Types.ObjectId(tenantId) },
    {
      $set: {
        "subscription.planId": planId,
        "subscription.status": "active",
        "subscription.currentPeriodEnd": validTo,
        updatedAt: new Date(),
      },
    },
  );
}

// GET /api/payments/plans (public — no auth needed)
paymentRoutes.get("/plans", (_req, res) => {
  const plans = Object.entries(PLAN_LIMITS).map(([id, plan]) => ({
    id,
    ...plan,
    priceMonthly: (plan as any).priceMonthly ?? 0,
  }));
  res.json({ success: true, data: plans });
});

// POST /api/payments/init — initiate SSLCommerz payment
paymentRoutes.post(
  "/init",
  extractUser,
  requirePermission(PERMISSIONS.SUBSCRIPTION_MANAGE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const { planId } = req.body;

      if (!planId || !(planId in PLAN_LIMITS)) {
        return next(new BadRequestError("Invalid plan"));
      }

      const plan = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS];
      const amount = (plan as any).priceMonthly;

      if (!amount) {
        return next(new BadRequestError("Free plan does not require payment"));
      }

      if (!STORE_ID || !STORE_PASSWORD) {
        return next(
          new BadRequestError(
            "SSLCommerz credentials not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.",
          ),
        );
      }

      // Create pending payment record
      const payment = await Payment.create({
        tenantId,
        planId,
        amount,
        currency: "BDT",
        status: "pending",
      });

      payment.transactionId = String(payment._id);
      await payment.save();

      const tran_id = String(payment._id);

      const sslData = {
        total_amount: amount,
        currency: "BDT",
        tran_id,
        success_url: `${GATEWAY_URL}/api/payments/success`,
        fail_url: `${GATEWAY_URL}/api/payments/fail`,
        cancel_url: `${GATEWAY_URL}/api/payments/cancel`,
        ipn_url: `${GATEWAY_URL}/api/payments/webhook`,
        shipping_method: "No",
        product_name: `PharmaSaaS ${planId} Plan`,
        product_category: "Subscription",
        product_profile: "non-physical-goods",
        cus_name: (req as any).user.name || "Customer",
        cus_email: (req as any).user.email || "customer@example.com",
        cus_add1: "N/A",
        cus_city: "N/A",
        cus_state: "N/A",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01700000000",
        value_a: tenantId,
        value_b: planId,
      };

      const sslcz = new SSLCommerzPayment(
        STORE_ID,
        STORE_PASSWORD,
        !IS_SANDBOX,
      );
      const apiResponse = await sslcz.init(sslData);

      if (apiResponse?.GatewayPageURL) {
        payment.gatewayResponse = {
          sessionkey: apiResponse.sessionkey,
          status: apiResponse.status,
        };
        await payment.save();

        res.json({
          success: true,
          data: {
            paymentId: payment._id,
            amount,
            currency: "BDT",
            gatewayUrl: apiResponse.GatewayPageURL,
          },
        });
      } else {
        payment.status = "failed";
        payment.gatewayResponse = apiResponse;
        await payment.save();

        return next(
          new BadRequestError(
            apiResponse?.failedreason ||
              "Failed to initialize payment gateway. Please try again.",
          ),
        );
      }
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/payments/webhook — SSLCommerz IPN callback (no auth)
paymentRoutes.post("/webhook", async (req, res, next) => {
  try {
    const { tran_id, status, val_id, amount } = req.body;

    if (!tran_id) return res.status(400).json({ success: false });

    const payment = await Payment.findOne({ transactionId: tran_id });
    if (!payment) return res.status(404).json({ success: false });

    // Validate the transaction with SSLCommerz
    if (status === "VALID" && val_id && STORE_ID && STORE_PASSWORD) {
      const sslcz = new SSLCommerzPayment(
        STORE_ID,
        STORE_PASSWORD,
        !IS_SANDBOX,
      );
      const validationResponse = await sslcz.validate({
        val_id,
      });

      if (
        validationResponse?.status === "VALID" ||
        validationResponse?.status === "VALIDATED"
      ) {
        payment.status = "success";
        payment.validFrom = new Date();
        payment.validTo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        payment.gatewayResponse = validationResponse;
        await payment.save();

        // Activate subscription directly in DB
        await activateTenantSubscription(
          String(payment.tenantId),
          payment.planId,
          payment.validTo!,
        );

        try {
          await publishEvent(EVENTS.PAYMENT_SUCCESS, {
            tenantId: payment.tenantId,
            planId: payment.planId,
            paymentId: payment._id,
            validTo: payment.validTo,
          });
        } catch {
          /* non-critical */
        }
      } else {
        payment.status = "failed";
        payment.gatewayResponse = validationResponse;
        await payment.save();
      }
    } else if (status === "FAILED" || status === "CANCELLED") {
      payment.status = status === "CANCELLED" ? "cancelled" : "failed";
      payment.gatewayResponse = req.body;
      await payment.save();

      try {
        await publishEvent(EVENTS.PAYMENT_FAILED, {
          tenantId: payment.tenantId,
          planId: payment.planId,
        });
      } catch {
        /* non-critical */
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/success — SSLCommerz redirects user here after success
paymentRoutes.post("/success", async (req, res) => {
  const { tran_id, val_id } = req.body;

  if (tran_id && val_id && STORE_ID && STORE_PASSWORD) {
    try {
      const payment = await Payment.findOne({ transactionId: tran_id });
      if (payment && payment.status === "pending") {
        const sslcz = new SSLCommerzPayment(
          STORE_ID,
          STORE_PASSWORD,
          !IS_SANDBOX,
        );
        const validation = await sslcz.validate({ val_id });

        if (
          validation?.status === "VALID" ||
          validation?.status === "VALIDATED"
        ) {
          payment.status = "success";
          payment.validFrom = new Date();
          payment.validTo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          payment.gatewayResponse = validation;
          await payment.save();

          // Activate subscription directly in DB (before redirect)
          await activateTenantSubscription(
            String(payment.tenantId),
            payment.planId,
            payment.validTo!,
          );

          try {
            await publishEvent(EVENTS.PAYMENT_SUCCESS, {
              tenantId: payment.tenantId,
              planId: payment.planId,
              paymentId: payment._id,
              validTo: payment.validTo,
            });
          } catch {
            /* non-critical */
          }
        }
      }
    } catch {
      /* redirect anyway */
    }
  }

  res.redirect(
    `${FRONTEND_URL}/payment/result?status=success&tran_id=${tran_id || ""}`,
  );
});

// POST /api/payments/fail — SSLCommerz redirects user here after failure
paymentRoutes.post("/fail", async (req, res) => {
  const { tran_id } = req.body;

  if (tran_id) {
    try {
      const payment = await Payment.findOne({ transactionId: tran_id });
      if (payment && payment.status === "pending") {
        payment.status = "failed";
        payment.gatewayResponse = req.body;
        await payment.save();
      }
    } catch {
      /* redirect anyway */
    }
  }

  res.redirect(
    `${FRONTEND_URL}/payment/result?status=failed&tran_id=${tran_id || ""}`,
  );
});

// POST /api/payments/cancel — SSLCommerz redirects user here on cancel
paymentRoutes.post("/cancel", async (req, res) => {
  const { tran_id } = req.body;

  if (tran_id) {
    try {
      const payment = await Payment.findOne({ transactionId: tran_id });
      if (payment && payment.status === "pending") {
        payment.status = "cancelled";
        await payment.save();
      }
    } catch {
      /* redirect anyway */
    }
  }

  res.redirect(
    `${FRONTEND_URL}/payment/result?status=cancelled&tran_id=${tran_id || ""}`,
  );
});

// GET /api/payments/history
paymentRoutes.get(
  "/history",
  extractUser,
  requirePermission(PERMISSIONS.SUBSCRIPTION_MANAGE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const payments = await Payment.find({ tenantId }).sort({ createdAt: -1 });
      res.json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  },
);
