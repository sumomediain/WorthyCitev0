import { Router, Request, Response } from "express";
import { ContentPage } from "../models/ContentPage";
import { ContentVersion } from "../models/ContentVersion";
import { Project } from "../models/Project";
import jwt from "jsonwebtoken";
import { validateAndSanitizeContent } from "../lib/citecore-validator";
import { deductOptimizationCredit } from "./billing";
import { optimizationQueue } from "../queues/optimizationQueue";
import { runOptimizationLogic } from "../lib/optimization";

const router = Router({ mergeParams: true });
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

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

router.post("/", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { projectId } = req.params;
        const { title, slug } = req.body;

        // Verify project ownership
        const project = await Project.findOne({ _id: projectId, userId });
        if (!project) {
            return res.status(404).json({ success: false, error: { message: "Project not found" } });
        }

        const now = new Date();
        // monthKey: YYYY-MM
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        // ENFORCE LIMIT: 5 Pages per month per user
        const pagesThisMonth = await ContentPage.countDocuments({
            userId,
            monthKey: currentMonthKey,
        });

        if (pagesThisMonth >= 5) {
            return res.status(423).json({
                success: false,
                error: { code: "LIMIT_REACHED", message: "Monthly content page limit (5) reached. Wait until next month or upgrade." },
            });
        }

        const page = await ContentPage.create({
            userId,
            projectId,
            title,
            slug,
            status: "draft",
            monthKey: currentMonthKey,
        });

        // Create initial empty draft version
        await ContentVersion.create({
            contentPageId: page._id,
            userId,
            type: "user_input",
            body: "",
            meta: {},
        });

        res.status(201).json({ success: true, data: page });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

router.get("/", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { projectId } = req.params;

        const pages = await ContentPage.find({ projectId, userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: pages });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

router.get("/:pageId", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { projectId, pageId } = req.params;

        const page = await ContentPage.findOne({ _id: pageId, projectId, userId });

        if (!page) {
            return res.status(404).json({ success: false, error: { message: "Page not found" } });
        }

        const versions = await ContentVersion.find({ contentPageId: pageId }).sort({ createdAt: -1 });

        res.json({ success: true, data: { ...page.toObject(), versions } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// CiteCore Orchestrator Endpoint
// Atomically deducts a credit and enqueues the AI pipeline
router.post("/:pageId/optimize", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { projectId, pageId } = req.params;
        const { draftContent } = req.body;

        // Verify page ownership
        const page = await ContentPage.findOne({ _id: pageId, projectId, userId });
        if (!page) {
            return res.status(404).json({ success: false, error: { message: "Content page not found" } });
        }

        // CiteCore Pre-Flight Validation (Stage 1)
        const validation = validateAndSanitizeContent(draftContent);
        if (!validation.isValid) {
            return res.status(422).json({ success: false, error: { message: "Validation failed", details: validation.errors } });
        }

        // Save input draft version
        const draftVersion = await ContentVersion.create({
            contentPageId: page._id,
            userId,
            type: "user_input",
            body: validation.sanitizedContent,
            meta: {}
        });

        // Deduct 1 optimization credit from Wallet atomically
        const creditDeducted = await deductOptimizationCredit(userId, pageId as string);
        if (!creditDeducted) {
            return res.status(402).json({ success: false, error: { message: "Insufficient credits to perform optimization. Please upgrade your plan." } });
        }

        if (process.env.MOCK_SERVICES === "true") {
            const inlineJobId = `mock-${Date.now()}`;
            // Fire and forget
            runOptimizationLogic(inlineJobId, userId as string, pageId as string, validation.sanitizedContent).catch(err => {
                console.error("Inline optimization failed:", err);
            });

            res.json({
                success: true,
                message: "Optimization job enqueued successfully.",
                jobId: inlineJobId
            });
        } else {
            // 4. Enqueue the task securely without waiting for OpenAI payload blocking
            const job = await optimizationQueue.add('worth-engine-optimize', {
                userId,
                pageId,
                versionId: String(draftVersion._id),
                draftContent: validation.sanitizedContent,
            }, {
                jobId: `optimize-${pageId}-${Date.now()}`
            });

            res.json({
                success: true,
                message: "Optimization job enqueued successfully.",
                jobId: job.id
            });
        }

        // Update page status
        page.status = "submitted";
        await page.save();

    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

// Export Optimized Content to DOCX
router.get("/:pageId/export", async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { projectId, pageId } = req.params;

        // Verify page ownership
        const page = await ContentPage.findOne({ _id: pageId, projectId, userId });
        if (!page) {
            return res.status(404).json({ success: false, error: { message: "Content page not found" } });
        }

        const optimizedVersion = await ContentVersion.findOne({
            contentPageId: pageId,
            type: "optimized"
        });

        if (!optimizedVersion) {
            return res.status(400).json({ success: false, error: { message: "Page is not optimized yet. Cannot export." } });
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: optimizedVersion.meta?.seoTitles?.[0] || page.title,
                        heading: HeadingLevel.HEADING_1,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Quality Score: ", bold: true }),
                            new TextRun(String(optimizedVersion.meta?.score || "N/A"))
                        ]
                    }),
                    new Paragraph({ text: "" }), // Spacing
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Meta Description: ", bold: true }),
                            new TextRun(optimizedVersion.meta?.metaDescription || "N/A")
                        ]
                    }),
                    new Paragraph({ text: "" }), // Spacing
                    new Paragraph({
                        text: "Content Breakdown:",
                        heading: HeadingLevel.HEADING_2,
                    }),
                    new Paragraph({ text: "" }), // Spacing
                    new Paragraph({
                        text: optimizedVersion.body
                    })
                ],
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        const sanitizeFilename = page.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        res.setHeader("Content-Disposition", `attachment; filename=citecore_${sanitizeFilename}.docx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.send(buffer);

    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

export default router;
