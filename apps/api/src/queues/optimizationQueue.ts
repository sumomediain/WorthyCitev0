import { Queue } from "bullmq";
import { connection } from "../lib/bullmq-redis";

export const OPTIMIZATION_QUEUE_NAME = "optimizationQueue";

export const optimizationQueue = new Queue(OPTIMIZATION_QUEUE_NAME, {
    connection: connection as any,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: "exponential",
            delay: 10000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for manual inspection/refunds if the auto-refund fails
    },
});

export interface OptimizationJobPayload {
    userId: string;
    pageId: string;
    versionId: string; // The draft version ID to optimize
    draftContent: string;
}
