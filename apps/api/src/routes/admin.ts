import { Router, Request, Response } from "express";
import { Wallet } from "../models/Wallet";
import { ContentPage } from "../models/ContentPage";
import { ContentVersion } from "../models/ContentVersion";

const router = Router();

// Minimal Superadmin route to view global platform stats
// In production, require strict role-based auth.
router.get("/stats", async (req: Request, res: Response) => {
    try {
        const totalWallets = await Wallet.countDocuments();
        const totalCreditsMintedAggregate = await Wallet.aggregate([{ $group: { _id: null, totalBalance: { $sum: "$balance" } } }]);
        const totalCredits = totalCreditsMintedAggregate[0]?.totalBalance || 0;

        const totalPages = await ContentPage.countDocuments();
        const optimizedPages = await ContentPage.countDocuments({ status: "optimized" });
        const failedPages = await ContentPage.countDocuments({ status: "failed" });

        res.json({
            success: true,
            data: {
                totalWallets,
                outstandingCreditsInSystem: totalCredits,
                platformUsage: {
                    totalPagesGenerated: totalPages,
                    optimizedOrchestrationsSuccessful: optimizedPages,
                    failedOrchestrations: failedPages
                }
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

export default router;
