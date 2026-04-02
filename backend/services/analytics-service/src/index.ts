import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "@pharmacy-saas/db";
import { connectRabbitMQ, consumeEvents } from "@pharmacy-saas/rabbitmq";
import { analyticsRoutes } from "./routes/analytics.routes";
import { errorHandler } from "./middleware/errorHandler";
import { handleAnalyticsEvent } from "./consumers/analyticsConsumer";

const app = express();
const PORT = process.env.PORT_ANALYTICS || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Analytics service running" });
});

app.use("/api/analytics", analyticsRoutes);

app.use(errorHandler);

async function start() {
  await connectDB(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas",
  );

  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL || "amqp://localhost:5672");
    await consumeEvents(
      "analytics-queue",
      ["sales.*", "inventory.*"],
      handleAnalyticsEvent,
    );
  } catch {
    console.warn("⚠️ RabbitMQ not available");
  }

  app.listen(PORT, () => {
    console.log(`📊 Analytics Service running on port ${PORT}`);
  });
}

start();
