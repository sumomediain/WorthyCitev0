import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        status: { type: String, default: "active", enum: ["active", "blocked"] },
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
