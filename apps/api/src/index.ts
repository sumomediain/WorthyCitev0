import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./lib/db";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import pageRoutes from "./routes/pages";
import billingRoutes from "./routes/billing";
import adminRoutes from "./routes/admin";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;


connectDB();

const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow generic frontend connections
    credentials: true, // Allow cookies
};

if (process.env.MOCK_SERVICES !== "true") {
    require("./workers/optimizationWorker");
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/pages", pageRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`CiteCore API is running on port ${port}`);
});
// Nodemon restart trigger
