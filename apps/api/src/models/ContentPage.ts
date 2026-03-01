import mongoose from "mongoose";

const contentPageSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
        title: { type: String, required: true },
        slug: { type: String, required: true },
        status: {
            type: String,
            enum: ["draft", "submitted", "optimized", "failed", "archived"],
            default: "draft"
        },
        monthKey: { type: String, required: true }, // Format: YYYY-MM
    },
    { timestamps: true }
);

// Indexes for quick limit lookups and dashboard sorting
contentPageSchema.index({ userId: 1, monthKey: 1, createdAt: -1 });
contentPageSchema.index({ projectId: 1, createdAt: -1 });

export const ContentPage = mongoose.model("ContentPage", contentPageSchema);
