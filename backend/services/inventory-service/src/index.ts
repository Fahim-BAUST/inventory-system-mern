import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "@pharmacy-saas/db";
import { connectRabbitMQ, consumeEvents } from "@pharmacy-saas/rabbitmq";
import { EVENTS } from "@pharmacy-saas/shared";
import { productRoutes } from "./routes/product.routes";
import { categoryRoutes } from "./routes/category.routes";
import { supplierRoutes } from "./routes/supplier.routes";
import { batchRoutes, productBatchRoutes } from "./routes/batch.routes";
import { purchaseOrderRoutes } from "./routes/purchaseOrder.routes";
import { errorHandler } from "./middleware/errorHandler";
import { startExpiryCron } from "./cron/expiryChecker";
import { handleInventoryEvent } from "./consumers/inventoryConsumer";

const app = express();
const PORT = process.env.PORT_INVENTORY || 4003;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Inventory service running" });
});

app.use("/api/inventory/products", productRoutes);
app.use("/api/inventory/products/:productId/batches", productBatchRoutes);
app.use("/api/inventory/categories", categoryRoutes);
app.use("/api/inventory/suppliers", supplierRoutes);
app.use("/api/inventory/expiry", batchRoutes);
app.use("/api/inventory/purchase-orders", purchaseOrderRoutes);

app.use(errorHandler);

async function start() {
  await connectDB(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas",
  );

  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL || "amqp://localhost:5672");
    await consumeEvents(
      "inventory-queue",
      [EVENTS.SALES_COMPLETED, EVENTS.SALES_RETURN_PROCESSED],
      handleInventoryEvent,
    );
  } catch {
    console.warn("⚠️ RabbitMQ not available");
  }

  startExpiryCron();

  app.listen(PORT, () => {
    console.log(`📦 Inventory Service running on port ${PORT}`);
  });
}

start();
