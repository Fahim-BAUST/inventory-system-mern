import { Batch } from "../models/batch.model";
import { Product } from "../models/product.model";
import { publishEvent } from "@pharmacy-saas/rabbitmq";
import { EVENTS } from "@pharmacy-saas/shared";

export async function handleInventoryEvent(
  routingKey: string,
  data: any,
): Promise<void> {
  switch (routingKey) {
    case EVENTS.SALES_COMPLETED: {
      await deductStock(data);
      break;
    }

    case EVENTS.SALES_RETURN_PROCESSED: {
      await restoreStock(data);
      break;
    }

    default:
      console.log(`📦 Inventory: unhandled event ${routingKey}`);
  }
}

/**
 * Deduct batch quantity + product totalStock for each sold item.
 * After deduction, check if totalStock <= reorderLevel → publish low stock alert.
 */
async function deductStock(data: any) {
  const { tenantId, items, invoiceNumber } = data;
  if (!items?.length) return;

  for (const item of items) {
    const { productId, batchId, quantity } = item;
    if (!productId || !quantity) continue;

    // Deduct from specific batch if provided
    if (batchId) {
      await Batch.findOneAndUpdate(
        { _id: batchId, tenantId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
      );
    }

    // Deduct from product totalStock
    const product = await Product.findOneAndUpdate(
      { _id: productId, tenantId },
      { $inc: { totalStock: -quantity } },
      { new: true },
    );

    if (!product) continue;

    console.log(
      `📦 Stock deducted: ${product.name} -${quantity} (remaining: ${product.totalStock}) [${invoiceNumber}]`,
    );

    // Check low stock threshold (reorderLevel)
    if (product.totalStock <= product.reorderLevel) {
      try {
        await publishEvent(EVENTS.INVENTORY_STOCK_LOW, {
          tenantId,
          productId: product._id,
          productName: product.name,
          currentStock: product.totalStock,
          reorderLevel: product.reorderLevel,
        });
      } catch {
        /* non-critical */
      }
    }
  }

  // Publish stock updated event
  try {
    await publishEvent(EVENTS.INVENTORY_STOCK_UPDATED, {
      tenantId,
      reason: "sale",
      invoiceNumber,
      itemCount: items.length,
    });
  } catch {
    /* non-critical */
  }
}

/**
 * Restore batch quantity + product totalStock for each returned item.
 */
async function restoreStock(data: any) {
  const { tenantId, items } = data;
  if (!items?.length) return;

  for (const item of items) {
    const { productId, batchId, quantity } = item;
    if (!productId || !quantity) continue;

    // Restore to batch
    if (batchId) {
      await Batch.findOneAndUpdate(
        { _id: batchId, tenantId },
        { $inc: { quantity: quantity } },
      );
    }

    // Restore product totalStock
    const product = await Product.findOneAndUpdate(
      { _id: productId, tenantId },
      { $inc: { totalStock: quantity } },
      { new: true },
    );

    if (product) {
      console.log(
        `📦 Stock restored: ${product.name} +${quantity} (now: ${product.totalStock})`,
      );
    }
  }

  // Publish stock updated event
  try {
    await publishEvent(EVENTS.INVENTORY_STOCK_UPDATED, {
      tenantId,
      reason: "return",
      itemCount: items.length,
    });
  } catch {
    /* non-critical */
  }
}
