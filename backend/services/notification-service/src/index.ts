import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "@pharmacy-saas/db";
import { connectRabbitMQ, consumeEvents } from "@pharmacy-saas/rabbitmq";
import { notificationRoutes } from "./routes/notification.routes";
import { errorHandler } from "./middleware/errorHandler";
import { handleNotificationEvent } from "./consumers/notificationConsumer";

const app = express();
const PORT = process.env.PORT_NOTIFICATION || 4007;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Notification service running" });
});

app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

async function start() {
  await connectDB(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas",
  );

  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL || "amqp://localhost:5672");
    await consumeEvents("notification-queue", ["#"], handleNotificationEvent);
  } catch {
    console.warn("⚠️ RabbitMQ not available");
  }

  app.listen(PORT, () => {
    console.log(`🔔 Notification Service running on port ${PORT}`);
  });
}

start();
