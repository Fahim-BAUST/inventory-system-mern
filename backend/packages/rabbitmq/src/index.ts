import amqplib, { ConsumeMessage } from "amqplib";
import { EXCHANGE_NAME } from "@pharmacy-saas/shared";

let connection: any = null;
let channel: any = null;

export async function connectRabbitMQ(url: string): Promise<any> {
  if (channel) return channel;

  try {
    connection = await amqplib.connect(url);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    console.log("✅ RabbitMQ connected");

    connection.on("error", (err: Error) => {
      console.error("RabbitMQ connection error:", err);
    });

    connection.on("close", () => {
      channel = null;
      connection = null;
      console.warn("RabbitMQ connection closed");
    });

    return channel;
  } catch (err) {
    console.error("❌ RabbitMQ connection failed:", err);
    throw err;
  }
}

export async function publishEvent(
  routingKey: string,
  data: unknown,
): Promise<void> {
  if (!channel) {
    console.warn("RabbitMQ channel not available, skipping event:", routingKey);
    return;
  }

  const message = Buffer.from(JSON.stringify(data));
  channel.publish(EXCHANGE_NAME, routingKey, message, {
    persistent: true,
    contentType: "application/json",
    timestamp: Date.now(),
  });
}

export async function consumeEvents(
  queueName: string,
  routingKeys: string[],
  handler: (routingKey: string, data: unknown) => Promise<void>,
): Promise<void> {
  if (!channel) throw new Error("RabbitMQ channel not initialized");

  await channel.assertQueue(queueName, { durable: true });

  for (const key of routingKeys) {
    await channel.bindQueue(queueName, EXCHANGE_NAME, key);
  }

  await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      await handler(msg.fields.routingKey, data);
      channel!.ack(msg);
    } catch (err) {
      console.error(
        `Error processing message [${msg.fields.routingKey}]:`,
        err,
      );
      channel!.nack(msg, false, false);
    }
  });

  console.log(`📡 Consuming queue: ${queueName} [${routingKeys.join(", ")}]`);
}

export async function disconnectRabbitMQ(): Promise<void> {
  if (channel) await channel.close();
  if (connection) await connection.close();
  channel = null;
  connection = null;
}
