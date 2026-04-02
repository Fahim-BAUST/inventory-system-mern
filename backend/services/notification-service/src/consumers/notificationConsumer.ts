import { Notification } from "../models/notification.model";
import { EVENTS } from "@pharmacy-saas/shared";

export async function handleNotificationEvent(
  routingKey: string,
  data: any,
): Promise<void> {
  console.log(`🔔 Notification event: ${routingKey}`);

  switch (routingKey) {
    case EVENTS.INVENTORY_STOCK_LOW:
      await Notification.create({
        tenantId: data.tenantId,
        type: "low_stock",
        title: "Low Stock Alert",
        message: `Product "${data.productName}" is running low (${data.currentStock} remaining).`,
        metadata: data,
      });
      break;

    case EVENTS.INVENTORY_BATCH_EXPIRING:
      await Notification.create({
        tenantId: data.tenantId,
        type: "expiry_warning",
        title: "Expiry Warning",
        message: `Batch ${data.batchNumber} is expiring on ${new Date(data.expiryDate).toLocaleDateString()}.`,
        metadata: data,
      });
      break;

    case EVENTS.INVENTORY_PRODUCT_CREATED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "system",
        title: "New Product Added",
        message: `Product "${data.name}" has been added to inventory.`,
        metadata: data,
      });
      break;

    case EVENTS.INVENTORY_STOCK_UPDATED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "system",
        title: "Stock Updated",
        message: `Stock updated for product "${data.productName || "item"}".`,
        metadata: data,
      });
      break;

    case EVENTS.SALES_COMPLETED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "system",
        title: "Sale Completed",
        message: `Sale ${data.invoiceNumber} completed — ৳${data.totalAmount?.toLocaleString() ?? 0}.`,
        metadata: data,
      });
      break;

    case EVENTS.SALES_RETURN_PROCESSED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "system",
        title: "Return Processed",
        message: `Return processed for sale — ৳${data.totalAmount?.toLocaleString() ?? 0} refunded.`,
        metadata: data,
      });
      break;

    case EVENTS.PAYMENT_SUCCESS:
      await Notification.create({
        tenantId: data.tenantId,
        type: "payment",
        title: "Payment Successful",
        message: `Your subscription payment was successful. Plan: ${data.planId}.`,
        metadata: data,
      });
      break;

    case EVENTS.PAYMENT_FAILED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "payment",
        title: "Payment Failed",
        message: `Your subscription payment failed. Please try again or use a different payment method.`,
        metadata: data,
      });
      break;

    case EVENTS.SUBSCRIPTION_ACTIVATED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "subscription",
        title: "Subscription Activated",
        message: `Your subscription has been activated. Plan: ${data.planId || "active"}.`,
        metadata: data,
      });
      break;

    case EVENTS.SUBSCRIPTION_EXPIRED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "subscription",
        title: "Subscription Expired",
        message:
          "Your subscription has expired. Please renew to continue using all features.",
        metadata: data,
      });
      break;

    case EVENTS.USER_REGISTERED:
      await Notification.create({
        tenantId: data.tenantId,
        type: "user",
        title: "New User Registered",
        message: `A new user (${data.email}) has registered with the role: ${data.role}.`,
        metadata: data,
      });
      break;

    case EVENTS.USER_INVITED:
      await Notification.create({
        tenantId: data.tenantId,
        userId: data.userId,
        type: "user",
        title: "Welcome!",
        message:
          "You have been invited to join this pharmacy. Check your email for login details.",
        metadata: data,
      });
      break;

    case EVENTS.TENANT_DELETED:
      // Tenant deleted — no notification needed (tenant is gone)
      console.log(`🗑️ Tenant ${data.tenantId} deleted: ${data.tenantName}`);
      break;

    default:
      console.log(`🔔 Unhandled notification event: ${routingKey}`);
  }
}
