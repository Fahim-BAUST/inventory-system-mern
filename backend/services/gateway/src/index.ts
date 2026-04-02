import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { proxyRoutes } from "./proxy";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT_GATEWAY || 4000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use(limiter);

// Health check (before proxy so body parsing is not needed)
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Gateway is running",
    timestamp: new Date().toISOString(),
  });
});

// Proxy routes MUST be before body parsing — proxy forwards raw request stream
proxyRoutes(app);

// Body parsing (only for non-proxied routes, if any)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
