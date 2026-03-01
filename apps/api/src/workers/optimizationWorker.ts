import { Worker, Job } from "bullmq";
import { connection } from "../lib/bullmq-redis";
import { OPTIMIZATION_QUEUE_NAME, OptimizationJobPayload } from "../queues/optimizationQueue";
import { runOptimizationLogic } from "../lib/optimization";

export const optimizationWorker = new Worker(
    OPTIMIZATION_QUEUE_NAME,
    async (job: Job<OptimizationJobPayload>) => {
        const { userId, pageId, versionId, draftContent } = job.data;

        try {
            await runOptimizationLogic(job.id || "unknown", userId, pageId, draftContent);
        } catch (error: any) {
            // Refund logic (handled via orchestrator/retry mechanisms ideally, 
            // but we can call our refund route logic internally here too)
            throw error; // Let BullMQ catch it and retry if attempts > 0
        }
    },
    { connection: connection as any, concurrency: 5 } // Process up to 5 jobs concurrently
);

optimizationWorker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
});

optimizationWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
});
