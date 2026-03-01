import mongoose from "mongoose";

const contentVersionSchema = new mongoose.Schema(
    {
        contentPageId: { type: mongoose.Schema.Types.ObjectId, ref: "ContentPage", required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        type: {
            type: String,
            enum: ["user_input", "optimized", "edited"],
            required: true
        },
        body: { type: String, default: "" }, // Markdown content
        meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // JSON for title/meta-desc/keywords
    },
    { timestamps: true }
);

contentVersionSchema.index({ contentPageId: 1, createdAt: -1 });

export const ContentVersion = mongoose.model("ContentVersion", contentVersionSchema);
