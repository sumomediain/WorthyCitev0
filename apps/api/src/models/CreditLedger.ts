import mongoose from "mongoose";

const creditLedgerSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
        amount: { type: Number, required: true }, // Positive for grants/refunds, negative for usage
        type: {
            type: String,
            enum: ["monthly_grant", "optimization_usage", "refund_system_failure", "manual_adjustment"],
            required: true
        },
        description: { type: String, required: true },
        relatedEntityId: { type: mongoose.Schema.Types.ObjectId }, // e.g. ContentPage / Job ID
    },
    { timestamps: true }
);

// Indexes
creditLedgerSchema.index({ userId: 1, createdAt: -1 });
creditLedgerSchema.index({ walletId: 1 });
creditLedgerSchema.index({ relatedEntityId: 1 });

export const CreditLedger = mongoose.model("CreditLedger", creditLedgerSchema);
