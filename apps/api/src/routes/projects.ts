import { Router, Request, Response } from "express";
import { Project } from "../models/Project";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

interface TokenPayload {
    userId: string;
}

// Middleware to authenticate and extract userId
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

router.post("/", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { name, description } = req.body;

        if (!name) {
            return res.status(422).json({ success: false, error: { message: "Project name is required" } });
        }

        const project = await Project.create({ userId, name, description });
        res.status(201).json({ success: true, data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

router.get("/", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const projects = await Project.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: projects });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

router.get("/:projectId", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { projectId } = req.params;

        const project = await Project.findOne({ _id: projectId, userId });

        if (!project) {
            return res.status(404).json({ success: false, error: { message: "Project not found" } });
        }

        res.json({ success: true, data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

export default router;
