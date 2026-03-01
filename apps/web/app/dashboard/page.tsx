import { redirect } from "next/navigation";

export default function DashboardRoute() {
    // Simply redirect to projects list for now as the main hub 
    // since the Sidebar houses the global stats
    redirect("/projects");
}
