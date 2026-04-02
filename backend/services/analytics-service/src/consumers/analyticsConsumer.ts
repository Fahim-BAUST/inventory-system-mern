import { DailySummary } from "../models/dailySummary.model";
import { EVENTS } from "@pharmacy-saas/shared";

export async function handleAnalyticsEvent(
  routingKey: string,
  data: any,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  switch (routingKey) {
    case EVENTS.SALES_COMPLETED: {
      await DailySummary.findOneAndUpdate(
        { tenantId: data.tenantId, date: today },
        {
          $inc: {
            totalSales: 1,
            totalRevenue: data.totalAmount || 0,
            itemsSold: data.items?.length || 0,
          },
        },
        { upsert: true },
      );
      console.log(`📊 Analytics: sale recorded for tenant ${data.tenantId}`);
      break;
    }

    case EVENTS.SALES_RETURN_PROCESSED: {
      await DailySummary.findOneAndUpdate(
        { tenantId: data.tenantId, date: today },
        {
          $inc: {
            totalReturns: 1,
            totalReturnAmount: data.totalAmount || 0,
          },
        },
        { upsert: true },
      );
      console.log(`📊 Analytics: return recorded for tenant ${data.tenantId}`);
      break;
    }

    case EVENTS.INVENTORY_STOCK_LOW: {
      await DailySummary.findOneAndUpdate(
        { tenantId: data.tenantId, date: today },
        { $inc: { lowStockAlerts: 1 } },
        { upsert: true },
      );
      console.log(
        `📊 Analytics: low stock alert for ${data.productName} (tenant ${data.tenantId})`,
      );
      break;
    }

    case EVENTS.INVENTORY_BATCH_EXPIRING: {
      await DailySummary.findOneAndUpdate(
        { tenantId: data.tenantId, date: today },
        { $inc: { expiryAlerts: 1 } },
        { upsert: true },
      );
      console.log(
        `📊 Analytics: expiry alert for batch ${data.batchNumber} (tenant ${data.tenantId})`,
      );
      break;
    }

    default:
      console.log(`📊 Analytics: unhandled event ${routingKey}`);
  }
}
