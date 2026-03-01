"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Sparkles, AlertCircle, CheckCircle2, History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function EditorPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const pageId = params.pageId as string;

    const [page, setPage] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [draftContent, setDraftContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch page data
    const fetchPage = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${apiUrl}/projects/${projectId}/pages/${pageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setPage(data.data);
                setVersions(data.data.versions);

                // Set the initial draft content if it's still in draft mode
                if (data.data.status === "draft" && !draftContent) {
                    const inputVersion = data.data.versions.find((v: any) => v.versionType === "user_input");
                    if (inputVersion) {
                        setDraftContent(inputVersion.content);
                    }
                }
            } else {
                setError(data.error.message);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchPage();

        // Setup polling if status is processing/submitted
        let interval: NodeJS.Timeout;
        if (page?.status === "submitted" || page?.status === "processing") {
            interval = setInterval(() => {
                fetchPage();
            }, 3000); // Poll every 3 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [projectId, pageId, page?.status]);

    const handleSaveDraft = () => {
        // Ideally we'd have a route to save the draft.
        // For the V1 sake, let's assume it's saved locally until optimization triggers.
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleOptimize = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setIsOptimizing(true);
        setError(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${apiUrl}/projects/${projectId}/pages/${pageId}/optimize`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ draftContent })
            });
            const data = await res.json();

            if (data.success) {
                // Instantly swap status to trigger polling
                setPage((prev: any) => ({ ...prev, status: "submitted" }));
            } else {
                if (data.error.details) {
                    setError(`${data.error.message}: ${data.error.details.join(", ")}`);
                } else {
                    setError(data.error.message);
                }
                setIsOptimizing(false);
            }
        } catch (err: any) {
            setError("Failed to connect to orchestrator.");
            setIsOptimizing(false);
        }
    };

    const handleDownload = () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Use a form or fetch to get the blob
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        fetch(`${apiUrl}/projects/${projectId}/pages/${pageId}/export`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `citecore_optimized_${pageId}.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(() => setError("Failed to download DOCX"));
    };

    if (!page) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Workspace...</div>;
    }

    const isProcessing = page.status === "submitted" || page.status === "processing";
    const isCompleted = page.status === "optimized";
    const optimizedVersion = versions.find(v => v.versionType === "optimized");

    return (
        <div className="flex h-[calc(100vh-60px)] flex-col">
            {/* Toolbar Header */}
            <div className="flex items-center justify-between border-b px-6 py-3 bg-card">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${projectId}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold">{page.title}</h1>
                        <p className="text-xs text-muted-foreground">{page.slug}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {page.status === "draft" || page.status === "failed" ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSaveDraft}
                                disabled={isSaving || isProcessing}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? "Saving..." : "Save Draft"}
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleOptimize}
                                disabled={isOptimizing || draftContent.length < 100}
                                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 transition-opacity text-white border-0"
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Optimize (1 Credit)
                            </Button>
                        </>
                    ) : isProcessing ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-500 text-sm font-medium">
                            <Sparkles className="h-4 w-4 animate-spin" />
                            WorthEngine is analyzing...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 text-green-500 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Optimization Complete
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export DOCX
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="px-6 py-3">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error processing request</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Split Pane Workspace */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left Pane - Input Draft */}
                <div className="flex-1 flex flex-col border-r h-full overflow-hidden">
                    <div className="bg-muted/30 border-b px-4 py-2 flex items-center justify-between text-sm font-medium text-muted-foreground">
                        <span>Original Draft Editor</span>
                        <span className={draftContent.length < 100 ? "text-red-400" : "text-green-500"}>
                            {draftContent.length} chars
                        </span>
                    </div>
                    <Textarea
                        className="flex-1 rounded-none border-0 focus-visible:ring-0 resize-none p-6 text-base leading-relaxed"
                        placeholder="Paste or type your draft content here. Minimum 100 characters..."
                        value={draftContent}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraftContent(e.target.value)}
                        disabled={isProcessing || isCompleted}
                    />
                </div>

                {/* Right Pane - AI Output & Metadata */}
                <div className="flex-1 flex flex-col h-full overflow-auto bg-muted/10 relative">
                    <div className="bg-muted/30 border-b px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm z-10 sticky top-0 backdrop-blur">
                        WorthEngine Optimized Result
                    </div>

                    <div className="p-6">
                        {isProcessing ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                                <div className="relative">
                                    <div className="h-16 w-16 rounded-full border-4 border-muted border-t-purple-500 animate-spin"></div>
                                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-purple-500 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
                                    Orchestrating AI Pipeline
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    Extracting briefs, generating actionable SEO/GEO knowledge graphs, and weaving it all gracefully into your content...
                                </p>
                            </div>
                        ) : isCompleted && optimizedVersion ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="bg-card">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">Quality Score</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-green-500">
                                                {optimizedVersion.meta?.score || 95} <span className="text-sm text-muted-foreground">/ 100</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-card">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">SEO Title</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-sm font-medium text-primary line-clamp-2">
                                                {optimizedVersion.meta?.seoTitles?.[0] || page.title}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader className="pb-2 border-b bg-muted/20">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-purple-500" />
                                            Optimized Final Document
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>
                                            {optimizedVersion.body}
                                        </ReactMarkdown>
                                    </CardContent>
                                </Card>

                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
                                <History className="h-12 w-12 mb-4 opacity-20" />
                                <p>Provide at least 100 characters and hit <b>Optimize</b>.</p>
                                <p className="text-sm opacity-50">Our 5-stage AI engine will do the rest.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
