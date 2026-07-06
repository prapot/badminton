"use client";

import { use } from "react";
import Navbar from "@/components/Navbar";
import { useHistoryData } from "../hooks/useHistoryData";
import { HistoryHeader } from "../components/HistoryHeader";
import { StatsSummary } from "../components/StatsSummary";
import { MatchHistoryList } from "../components/MatchHistoryList";

export default function HistoryPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { 
        user, 
        targetUser, 
        seasons, 
        selectedSeason, 
        setSelectedSeason, 
        page, 
        setPage, 
        loading, 
        rankingStats, 
        histories, 
        error, 
        meta 
    } = useHistoryData(userId);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8">
                
                <HistoryHeader 
                    targetUser={targetUser}
                    seasons={seasons}
                    selectedSeason={selectedSeason}
                    setSelectedSeason={setSelectedSeason}
                    setPage={setPage}
                />

                <StatsSummary 
                    loading={loading}
                    rankingStats={rankingStats}
                />

                <MatchHistoryList 
                    histories={histories}
                    loading={loading}
                    error={error}
                    userId={userId}
                    page={page}
                    setPage={setPage}
                    meta={meta}
                />

            </main>
        </div>
    );
}
