import cron from "node-cron";
import { Batch } from "../models/batch.model";
import { publishEvent } from "@pharmacy-saas/rabbitmq";
import { EVENTS } from "@pharmacy-saas/shared";

export function startExpiryCron() {
  // Run daily at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("🕐 Running expiry check...");
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      const expiringBatches = await Batch.find({
        expiryDate: { $lte: thirtyDaysFromNow, $gte: now },
        quantity: { $gt: 0 },
      }).populate("productId", "name");

      for (const batch of expiringBatches) {
        try {
          await publishEvent(EVENTS.INVENTORY_BATCH_EXPIRING, {
            batchId: batch._id,
            productId: batch.productId,
            tenantId: batch.tenantId,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            quantity: batch.quantity,
          });
        } catch {
          // non-critical
        }
      }

      console.log(
        `✅ Expiry check complete: ${expiringBatches.length} batches expiring soon`,
      );
    } catch (err) {
      console.error("Expiry check failed:", err);
    }
  });

  console.log("📅 Expiry cron job scheduled (daily 8:00 AM)");
}
