import { CircleUser, Menu, Package2 } from "lucide-react";
import Link from "next/link";

export function Header() {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <div className="w-full flex-1">
                {/* Mobile Nav would go here */}
            </div>
            <div className="flex px-4 gap-2 items-center">
                <div className="text-sm font-medium mr-4">
                    <span className="text-muted-foreground">Credits: </span>
                    <span className="font-bold">50 / 50</span>
                </div>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                    <CircleUser className="h-5 w-5" />
                    <span className="sr-only">Toggle user menu</span>
                </button>
            </div>
        </header>
    );
}
