"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock API Call for V1 UI Scaffold
const fetchProjectDetails = async (id: string) => {
    return {
        _id: id,
        name: "Candere GEO Strategy",
        description: "Gold and diamond jewelry optimization",
    };
};

const fetchPages = async (projectId: string) => {
    return [
        { _id: "p1", title: "Best Engagement Rings 2024", slug: "best-engagement-rings-2024", status: "optimized", updatedAt: "2024-03-01T10:00:00Z" },
        { _id: "p2", title: "How to clean gold at home", slug: "how-to-clean-gold", status: "draft", updatedAt: "2024-03-05T14:20:00Z" },
        { _id: "p3", title: "Diamond Certification Guide", slug: "diamond-certification-guide", status: "failed", updatedAt: "2024-03-10T09:15:00Z" },
    ];
};

export default function SingleProjectPage() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<any>(null);
    const [pages, setPages] = useState<any[]>([]);
    const [newPageTitle, setNewPageTitle] = useState("");
    const [newPageSlug, setNewPageSlug] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails(projectId).then(setProject);
            fetchPages(projectId).then(setPages);
        }
    }, [projectId]);

    const handleCreatePage = async (e: React.FormEvent) => {
        e.preventDefault();
        // In actual implementation: POST /api/projects/:projectId/pages
        const newPage = {
            _id: Date.now().toString(),
            title: newPageTitle,
            slug: newPageSlug,
            status: "draft",
            updatedAt: new Date().toISOString()
        };
        setPages([newPage, ...pages]);
        setIsOpen(false);
        setNewPageTitle("");
        setNewPageSlug("");
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "optimized": return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Optimized</Badge>;
            case "draft": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
            case "submitted": return <Badge variant="outline" className="text-blue-600 border-blue-600"><Clock className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
            case "failed": return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (!project) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/projects">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                    <p className="text-muted-foreground">{project.description}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-8">
                <h2 className="text-xl font-semibold tracking-tight">Content Pages</h2>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Page
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreatePage}>
                            <DialogHeader>
                                <DialogTitle>Create Content Page</DialogTitle>
                                <DialogDescription>
                                    Start a new SEO/GEO optimization page. This counts towards your monthly limit of 5.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Page Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Best Engagement Rings"
                                        value={newPageTitle}
                                        onChange={(e) => {
                                            setNewPageTitle(e.target.value);
                                            if (!newPageSlug) {
                                                setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                                            }
                                        }}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slug">URL Slug</Label>
                                    <Input
                                        id="slug"
                                        placeholder="best-engagement-rings"
                                        value={newPageSlug}
                                        onChange={(e) => setNewPageSlug(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Create Page</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    {pages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-lg font-medium">No pages created yet</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Create your first content page to start generating SEO and GEO optimized content.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pages.map((page) => (
                                    <TableRow key={page._id}>
                                        <TableCell className="font-medium">{page.title}</TableCell>
                                        <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                                        <TableCell>{getStatusBadge(page.status)}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(page.updatedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/projects/${projectId}/pages/${page._id}`}>
                                                    Open <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
