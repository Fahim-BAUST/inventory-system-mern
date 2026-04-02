import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "@pharmacy-saas/db";
import { connectRabbitMQ } from "@pharmacy-saas/rabbitmq";
import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";
import { roleRoutes } from "./routes/role.routes";
import { adminRoutes } from "./routes/admin.routes";
import { errorHandler } from "./middleware/errorHandler";
import { seedSuperAdmin } from "./services/auth.service";

const app = express();
const PORT = process.env.PORT_AUTH || 4001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Auth service running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth/users", userRoutes);
app.use("/api/auth/roles", roleRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

async function start() {
  await connectDB(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas",
  );

  // Seed super admin on first startup
  await seedSuperAdmin();

  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL || "amqp://localhost:5672");
  } catch {
    console.warn("⚠️ RabbitMQ not available, running without event bus");
  }

  app.listen(PORT, () => {
    console.log(`🔑 Auth Service running on port ${PORT}`);
  });
}

start();
