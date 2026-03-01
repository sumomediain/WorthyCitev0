import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "superrefreshsecret";

const generateTokens = (userId: string) => {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
    return { accessToken, refreshToken };
};

router.post("/register", async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, error: { message: "Email already in use" } });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await User.create({ name, email, passwordHash });

        const { accessToken, refreshToken } = generateTokens(newUser._id.toString());

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, data: { userId: newUser._id, accessToken } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
        }

        const { accessToken, refreshToken } = generateTokens(user._id.toString());

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, data: { userId: user._id, accessToken } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

router.post("/refresh", async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ success: false, error: { message: "Refresh token not found" } });
        }

        const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, error: { message: "User not found" } });
        }

        const tokens = generateTokens(user._id.toString());

        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true, data: { accessToken: tokens.accessToken } });
    } catch (error: any) {
        res.status(401).json({ success: false, error: { message: "Invalid or expired refresh token" } });
    }
});

router.post("/logout", (req: Request, res: Response) => {
    res.clearCookie("refreshToken");
    res.json({ success: true, data: { message: "Logged out successfully" } });
});

export default router;
