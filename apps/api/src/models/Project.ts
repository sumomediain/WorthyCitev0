import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
    },
    { timestamps: true }
);

// Indexes
projectSchema.index({ userId: 1, createdAt: -1 });

export const Project = mongoose.model("Project", projectSchema);
