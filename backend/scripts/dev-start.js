/**
 * Development Launcher
 * Connects to local MongoDB and launches all microservices + frontend.
 * Usage: node scripts/dev-start.js
 */
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const SERVICES = [
  { name: "Gateway", workspace: "services/gateway", color: "\x1b[36m" },
  { name: "Auth", workspace: "services/auth-service", color: "\x1b[32m" },
  { name: "Tenant", workspace: "services/tenant-service", color: "\x1b[33m" },
  {
    name: "Inventory",
    workspace: "services/inventory-service",
    color: "\x1b[35m",
  },
  { name: "Sales", workspace: "services/sales-service", color: "\x1b[34m" },
  {
    name: "Analytics",
    workspace: "services/analytics-service",
    color: "\x1b[31m",
  },
  { name: "Payment", workspace: "services/payment-service", color: "\x1b[37m" },
  {
    name: "Notification",
    workspace: "services/notification-service",
    color: "\x1b[96m",
  },
];

const RESET = "\x1b[0m";
const children = [];

function checkPort(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(2000);
    sock.on("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("timeout", () => {
      sock.destroy();
      resolve(false);
    });
    sock.on("error", () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, "127.0.0.1");
  });
}

async function main() {
  console.log("🚀 Starting Pharmacy SaaS Development Environment...\n");

  // 1. Check local MongoDB is running
  console.log("📦 Checking local MongoDB...");
  const mongoUp = await checkPort(27017);
  if (!mongoUp) {
    console.error("❌ MongoDB is not running on port 27017!");
    console.error("   Start it with: net start MongoDB");
    console.error("   Or install: winget install MongoDB.Server");
    process.exit(1);
  }
  const mongoUri = "mongodb://localhost:27017/pharmacy-saas";
  console.log(`✅ MongoDB is running at: ${mongoUri}\n`);

  // 2. Set env variables
  const env = {
    ...process.env,
    MONGODB_URI: mongoUri,
    NODE_ENV: "development",
  };

  // 3. Start all backend services
  console.log("⚙️  Starting backend services...\n");

  for (const svc of SERVICES) {
    const child = spawn("npm", ["run", "dev"], {
      cwd: path.join(__dirname, "..", svc.workspace),
      env,
      shell: true,
      stdio: "pipe",
    });

    children.push(child);

    const pad = svc.name.padEnd(12);
    child.stdout.on("data", (data) => {
      process.stdout.write(`${svc.color}[${pad}]${RESET} ${data}`);
    });
    child.stderr.on("data", (data) => {
      process.stderr.write(`${svc.color}[${pad}]${RESET} ${data}`);
    });
    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`${svc.color}[${pad}]${RESET} exited with code ${code}`);
      }
    });
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  🏥 Pharmacy SaaS Backend is starting up!");
  console.log("  ");
  console.log("  Gateway:     http://localhost:4000");
  console.log("  MongoDB:     localhost:27017 (persistent)");
  console.log("  RabbitMQ:    Skipped (events logged only)");
  console.log("  ");
  console.log("  Start frontend separately: cd ../frontend && npm run dev");
  console.log("  Press Ctrl+C to stop all services");
  console.log("═══════════════════════════════════════════════════");
  console.log("");

  // Graceful shutdown
  function shutdown() {
    console.log("\n🛑 Shutting down...");
    for (const child of children) {
      try {
        child.kill("SIGTERM");
      } catch {}
    }
    console.log("✅ All services stopped. MongoDB keeps running. Goodbye!");
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
