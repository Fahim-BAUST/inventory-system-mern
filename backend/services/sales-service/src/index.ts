import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "@pharmacy-saas/db";
import { connectRabbitMQ } from "@pharmacy-saas/rabbitmq";
import { salesRoutes } from "./routes/sales.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT_SALES || 4004;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Sales service running" });
});

app.use("/api/sales", salesRoutes);

app.use(errorHandler);

async function start() {
  await connectDB(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas",
  );
  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL || "amqp://localhost:5672");
  } catch {
    console.warn("⚠️ RabbitMQ not available");
  }

  app.listen(PORT, () => {
    console.log(`🛒 Sales Service running on port ${PORT}`);
  });
}

start();
