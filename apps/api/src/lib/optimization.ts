import { ContentVersion } from "../models/ContentVersion";
import { ContentPage } from "../models/ContentPage";
import { worthEngine } from "./worth-engine";

export const runOptimizationLogic = async (jobId: string, userId: string, pageId: string, draftContent: string) => {
    console.log(`[WorthEngine] Starting optimization inline ${jobId} for user ${userId}, page ${pageId}`);

    try {
        // Update page status to processing
        await ContentPage.updateOne({ _id: pageId }, { status: "submitted" });

        const result = await worthEngine.execute(draftContent);

        // Save the new AI-generated version
        await ContentVersion.create({
            contentPageId: pageId,
            userId: userId,
            type: "optimized",
            body: result.content,
            meta: {
                jobId: jobId,
                score: result.metadata.score,
                seoTitles: result.metadata.seoTitles,
                metaDescription: result.metadata.metaDescription,
                faqs: result.metadata.faqs
            }
        });

        // Update page status to completed
        await ContentPage.updateOne({ _id: pageId }, { status: "optimized" });
        console.log(`[WorthEngine] Completed inline job ${jobId}`);

    } catch (error: any) {
        console.error(`[WorthEngine] Inline Job ${jobId} failed:`, error.message);

        // Mark page as failed
        await ContentPage.updateOne({ _id: pageId }, { status: "failed" });

        throw error;
    }
};
