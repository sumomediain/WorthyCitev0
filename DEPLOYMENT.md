# CiteCore SaaS - Deployment Guide

Since this is a Turborepo monorepo with distinct Next.js frontend and Node.js backend processes, you will need to deploy them to respective services that handle their environments best. The quickest and most robust way to launch is using **Vercel** for the frontend and **Render** (or Railway/Fly) for the backend.

## 1. Prepare Services & Databases

Before deploying code, you need production connections for your data and queues. Do not use the `MOCK_SERVICES=true` local flag in production.

### A. MongoDB (Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) and create a free cluster.
2. In Database Access, create a user and password.
3. In Network Access, allow access from anywhere (`0.0.0.0/0`).
4. Click **Connect -> Drivers -> Node.js** and copy the Connection String. You will need this as your `MONGODB_URI`.

### B. Upstash Redis (Queue for BullMQ)
1. Go to [Upstash](https://upstash.com/) and create a free Redis database.
2. Copy the **Redis URL** (starts with `rediss://...`). You will need this as your `REDIS_URL`.

### C. OpenAI (WorthEngine AI)
1. Go to [OpenAI API](https://platform.openai.com/api-keys) and generate a new production secret key.

---

## 2. Deploy Backend API & Worker (Render.com)

We will deploy the Express server on Render as a "Web Service". The Express index automatically spins up the BullMQ worker alongside it in the same instance, allowing background jobs to run efficiently without requiring a separate server.

1. Push your repository to GitHub.
2. Log into [Render.com](https://render.com/) and click **New + -> Web Service**.
3. Connect your GitHub repository.
4. **Environment Settings**:
   - **Build Command**: `npm install && npx turbo run build --filter=api`
   - **Start Command**: `cd apps/api && npm run start`
   *(Note: ensure you have a `start: "node dist/index.js"` script in `apps/api/package.json` for production, and ensure `tsc` compiled successfully).*
5. **Environment Variables** (Add these on the Render dashboard):
   - `OPENAI_API_KEY`: (Your OpenAI Key)
   - `JWT_SECRET`: (Generate a long random string, e.g., `o8y43h598yv43...`)
   - `REDIS_URL`: (Your Upstash Redis URL)
   - `MONGODB_URI`: (Your MongoDB Atlas URL)
   - `MOCK_SERVICES`: `false`
   - `PORT`: `4000`
6. Click **Deploy Web Service**. Render will give you a public URL (e.g., `https://citecore-api.onrender.com`).

---

## 3. Deploy Frontend Web App (Vercel)

Vercel natively understands Next.js and Turborepo out of the box.

1. First, inside your frontend codebase, update any hardcoded `http://localhost:4000` URLs to point to an environment variable (like `process.env.NEXT_PUBLIC_API_URL`).
2. Log into [Vercel](https://vercel.com/) and click **Add New -> Project**.
3. Connect your GitHub repository. Vercel will automatically detect the Turborepo and the `apps/web` Next.js directory.
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Paste the secure URL you got from Render in Step 2 (e.g., `https://citecore-api.onrender.com`).
5. Click **Deploy**. Vercel will build your Next.js app, assign a global edge CDN, and give you your live URL (e.g., `https://citecore.vercel.app`).

---

## 4. Production Security Hardening Checklist

Before launching to real users, make sure you configure your backend `corsOptions` in `apps/api/src/index.ts` to only accept traffic from your new Vercel domain.

```typescript
const corsOptions = {
    origin: "https://citecore.vercel.app", // ONLY allow your real frontend
    credentials: true, // Crucial for JWT HttpOnly Cookies
};
```
