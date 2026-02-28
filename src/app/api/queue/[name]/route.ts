import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

export async function GET(request: NextRequest, context: { params: { name: string } }): Promise<NextResponse> {
  try {
    const { name } = context.params;
    const queue = new Queue(name, { connection: redisOptions });
    const counts = await queue.getJobCounts();
    await queue.close();

    return NextResponse.json({
      name,
      counts: {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
