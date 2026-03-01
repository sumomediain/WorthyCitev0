import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        monthKey: { type: String, required: true }, // Format: YYYY-MM
        balance: { type: Number, required: true, default: 50, min: 0 },
        plan: { type: String, enum: ["base", "pro", "enterprise"], default: "base" },
    },
    { timestamps: true }
);

// Compound index to ensure 1 wallet per user per month
walletSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export const Wallet = mongoose.model("Wallet", walletSchema);
