import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "@pharmacy-saas/db";
import { connectRabbitMQ, consumeEvents } from "@pharmacy-saas/rabbitmq";
import { EVENTS } from "@pharmacy-saas/shared";
import { tenantRoutes } from "./routes/tenant.routes";
import { errorHandler } from "./middleware/errorHandler";
import { Tenant } from "./models/tenant.model";

const app = express();
const PORT = process.env.PORT_TENANT || 4002;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Tenant service running" });
});

app.use("/api/tenants", tenantRoutes);

app.use(errorHandler);

async function handleTenantEvent(routingKey: string, data: any) {
  switch (routingKey) {
    case EVENTS.PAYMENT_SUCCESS: {
      const { tenantId, planId, validTo } = data;
      if (!tenantId || !planId) break;

      await Tenant.findByIdAndUpdate(tenantId, {
        "subscription.planId": planId,
        "subscription.status": "active",
        "subscription.currentPeriodEnd": validTo
          ? new Date(validTo)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      console.log(
        `✅ Subscription activated: tenant=${tenantId} plan=${planId}`,
      );
      break;
    }
    case EVENTS.PAYMENT_FAILED: {
      const { tenantId } = data;
      if (!tenantId) break;
      console.log(`⚠️ Payment failed for tenant=${tenantId}`);
      break;
    }
    case EVENTS.SUBSCRIPTION_EXPIRED: {
      const { tenantId } = data;
      if (!tenantId) break;

      await Tenant.findByIdAndUpdate(tenantId, {
        "subscription.status": "expired",
      });
      console.log(`⏰ Subscription expired: tenant=${tenantId}`);
      break;
    }
  }
}

async function start() {
  await connectDB(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas",
  );

  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL || "amqp://localhost:5672");
    await consumeEvents(
      "tenant-queue",
      [
        EVENTS.PAYMENT_SUCCESS,
        EVENTS.PAYMENT_FAILED,
        EVENTS.SUBSCRIPTION_EXPIRED,
      ],
      handleTenantEvent,
    );
  } catch {
    console.warn("⚠️ RabbitMQ not available, running without event bus");
  }

  app.listen(PORT, () => {
    console.log(`🏪 Tenant Service running on port ${PORT}`);
  });
}

start();
