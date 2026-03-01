import { Router, Request, Response } from "express";
import { Wallet } from "../models/Wallet";
import { CreditLedger } from "../models/CreditLedger";
import { ContentPage } from "../models/ContentPage";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const router = Router();

// Reusable interface since it's used across routes
interface TokenPayload {
    userId: string;
}

const requireAuth = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    }
    const secret = process.env.JWT_SECRET as string || "supersecret";
    try {
        const decoded = jwt.verify(token, secret);
        if (typeof decoded === 'object' && 'userId' in decoded) {
            (req as any).userId = (decoded as TokenPayload).userId;
            next();
        } else {
            throw new Error("Invalid token payload");
        }
    } catch (err) {
        return res.status(401).json({ success: false, error: { message: "Invalid or expired token" } });
    }
};

router.use(requireAuth);

/**
 * Ensures a wallet exists for the given user for the current month.
 * If not, creates one and mints the initial 50 credits in the ledger.
 */
export async function getOrCreateWallet(userId: string) {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let wallet: any = await Wallet.findOne({ userId, monthKey: currentMonthKey });

    if (!wallet) {
        // Use a session to ensure wallet and initial ledger grant happen atomically
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            // Handle race conditions where another request created it during our lock opening
            wallet = await Wallet.findOne({ userId, monthKey: currentMonthKey }).session(session);
            if (!wallet) {
                wallet = await Wallet.create([{
                    userId,
                    monthKey: currentMonthKey,
                    balance: 50,
                    plan: "base"
                }], { session }).then(w => w[0]);

                await CreditLedger.create([{
                    userId,
                    walletId: wallet._id,
                    amount: 50,
                    type: "monthly_grant",
                    description: `Base plan 50 credits granted for ${currentMonthKey}`
                }], { session });
            }
        });
        session.endSession();
    }
    return wallet;
}

// Get user's current billing/credit status
router.get("/status", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const wallet = await getOrCreateWallet(userId);

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const pagesThisMonth = await ContentPage.countDocuments({
            userId,
            monthKey: currentMonthKey,
        });

        res.json({ success: true, data: { wallet, pagesThisMonth, pagesLimit: 5 } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Used via inner server functions or tested via an admin endpoint
// Decrements 1 credit atomically and writes a ledger entry
export async function deductOptimizationCredit(userId: string, pageId: string) {
    const wallet = await getOrCreateWallet(userId);
    if (!wallet) throw new Error("Could not find or create wallet.");

    const session = await mongoose.startSession();
    try {
        let success = false;
        await session.withTransaction(async () => {
            // Re-fetch inside transaction with pessimistic locking
            // Note: Mongoose findOneAndUpdate with inc is generally atomic on its own,
            // but we need the transaction wrapper to guarantee the Ledger entry writes alongside it.
            const w = await Wallet.findOne({ _id: (wallet as any)._id }).session(session);

            if (!w || w.balance < 1) {
                throw new Error("INSUFFICIENT_CREDITS");
            }

            w.balance -= 1;
            await w.save({ session });

            await CreditLedger.create([{
                userId,
                walletId: w._id,
                amount: -1,
                type: "optimization_usage",
                description: "Charged 1 credit for optimization of page",
                relatedEntityId: new mongoose.Types.ObjectId(pageId)
            }], { session });

            success = true;
        });

        return success;
    } catch (error: any) {
        if (error.message === "INSUFFICIENT_CREDITS") return false;
        throw error;
    } finally {
        session.endSession();
    }
}

export default router;
