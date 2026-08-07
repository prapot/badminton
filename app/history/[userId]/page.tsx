"use client";

import { use, useState } from "react";
import Navbar from "@/components/Navbar";
import { useHistoryData } from "../hooks/useHistoryData";
import { HistoryHeader } from "../components/HistoryHeader";
import { StatsSummary } from "../components/StatsSummary";
import { MatchHistoryList } from "../components/MatchHistoryList";
import { HistoryAnalytics } from "../components/HistoryAnalytics";
import { BestPartners } from "../components/BestPartners";

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
        meta,
        analyticsData 
    } = useHistoryData(userId);

    const [activeTab, setActiveTab] = useState<'history' | 'analytics'>('history');

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

                {/* Tab Navigation */}
                <div className="flex gap-4 mb-6 border-b border-white/10">
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'history' ? 'border-[#2ecc71] text-[#2ecc71]' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        ประวัติแมทช์ (Match History)
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'analytics' ? 'border-[#2ecc71] text-[#2ecc71]' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        วิเคราะห์สถิติ (Analytics)
                    </button>
                </div>

                {activeTab === 'history' && (
                    <MatchHistoryList 
                        histories={histories}
                        loading={loading}
                        error={error}
                        userId={userId}
                        page={page}
                        setPage={setPage}
                        meta={meta}
                    />
                )}

                {activeTab === 'analytics' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {!loading && (
                            <HistoryAnalytics 
                                analyticsData={analyticsData}
                                rankingStats={rankingStats}
                            />
                        )}
                        <BestPartners userId={userId} selectedSeason={selectedSeason} />
                    </div>
                )}

            </main>
        </div>
    );
}
