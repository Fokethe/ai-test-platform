import { NextResponse } from "next/server";
import { Queue } from "bullmq";

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

const QUEUE_NAMES = [
  "test-generation",
  "document-processing",
  "review-processing",
];

export async function GET(): Promise<NextResponse> {
  try {
    const queues = await Promise.all(
      QUEUE_NAMES.map(async (name) => {
        const queue = new Queue(name, { connection: redisOptions });
        const counts = await queue.getJobCounts();
        await queue.close();
        return {
          name,
          counts: {
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
          },
        };
      })
    );

    return NextResponse.json({ queues });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
