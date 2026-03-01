"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, FileText, Settings, Database, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function Sidebar() {
    const [billingStatus, setBillingStatus] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            fetch(`${apiUrl}/billing/status`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setBillingStatus({
                            credits: data.data.wallet.balance,
                            pagesUsed: data.data.pagesThisMonth,
                            pagesLimit: data.data.pagesLimit
                        });
                    }
                })
                .catch(err => console.error(err));
        }
    }, []);

    return (
        <aside className="w-64 border-r bg-muted/40 hidden md:flex flex-col">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <span className="text-primary text-xl font-bold">CiteCore</span>
                </Link>
            </div>

            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Link>
                    <Link
                        href="/projects"
                        className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
                    >
                        <FileText className="h-4 w-4" />
                        Projects
                    </Link>
                    <Link
                        href="/billing"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <Database className="h-4 w-4" />
                        Billing
                    </Link>
                </nav>
            </div>

            {/* Usage Stats Card */}
            {billingStatus && (
                <div className="mt-auto p-4 border-t bg-muted/20">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Credits left</span>
                                <span>{billingStatus.credits}</span>
                            </div>
                            <Progress value={Math.min(100, (billingStatus.credits / 50) * 100)} className="h-2" />
                            <p className="text-[10px] text-muted-foreground text-right w-full">Resets 1st of month</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-blue-500" /> Monthly Pages</span>
                                <span>{billingStatus.pagesUsed} / {billingStatus.pagesLimit}</span>
                            </div>
                            <Progress
                                value={(billingStatus.pagesUsed / billingStatus.pagesLimit) * 100}
                                className={`h-2 ${billingStatus.pagesUsed >= billingStatus.pagesLimit ? '[&>div]:bg-red-500' : ''}`}
                            />
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
