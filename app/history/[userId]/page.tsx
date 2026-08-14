import Navbar from "@/components/Navbar";
import { HistoryDashboard } from "../components/HistoryDashboard";

export default async function HistoryPage({ params }: { params: Promise<{ userId: string }> }) {
    // Next.js 15: Await params directly in Server Component
    const { userId } = await params;

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <HistoryDashboard userId={userId} />
            </main>
        </div>
    );
}
