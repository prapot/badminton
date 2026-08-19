"use client";

import { useState } from "react";
import { useHistoryData } from "../hooks/useHistoryData";
import { HistoryHeader } from "./HistoryHeader";
import { StatsSummary } from "./StatsSummary";
import { MatchHistoryList } from "./MatchHistoryList";
import { HistoryAnalytics } from "./HistoryAnalytics";
import { BestPartners } from "./BestPartners";
import { Nemesis } from "./Nemesis";

export function HistoryDashboard({ userId }: { userId: string }) {
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
    const [analyticsTab, setAnalyticsTab] = useState<'partners' | 'nemesis'>('partners');

    // Added Skeleton loader to prevent blank screen during initial load
    if (!user && loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-40 bg-white/5 rounded-2xl w-full"></div>
                <div className="h-32 bg-white/5 rounded-2xl w-full"></div>
                <div className="h-64 bg-white/5 rounded-2xl w-full"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <>
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

            {/* Main Tab Navigation */}
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
                    
                    {/* Sub-tab Navigation for Partners / Nemesis */}
                    <div className="flex gap-4 mt-8 mb-2 border-b border-white/10">
                        <button 
                            onClick={() => setAnalyticsTab('partners')}
                            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${analyticsTab === 'partners' ? 'border-green-500 text-green-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <span>🏆</span> คู่หูรู้ใจ
                        </button>
                        <button 
                            onClick={() => setAnalyticsTab('nemesis')}
                            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${analyticsTab === 'nemesis' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <span>👿</span> คู่แค้น
                        </button>
                    </div>

                    {analyticsTab === 'partners' ? (
                        <BestPartners userId={userId} selectedSeason={selectedSeason} />
                    ) : (
                        <Nemesis userId={userId} selectedSeason={selectedSeason} />
                    )}
                </div>
            )}
        </>
    );
}
