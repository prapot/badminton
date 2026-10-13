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
        filterDate,
        setFilterDate,
        loading, 
        rankingStats, 
        lifetimeStats,
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
                lifetimeStats={lifetimeStats}
            />

            <StatsSummary
                loading={loading}
                rankingStats={rankingStats}
                seasons={seasons}
                selectedSeason={selectedSeason}
                setSelectedSeason={setSelectedSeason}
                setPage={setPage}
            />

            {/* Main Tab Navigation */}
            <div className="grid grid-cols-2 mb-6 border-b border-white/10">
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`min-h-11 pb-2 px-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'history' ? 'border-[#2ecc71] text-[#2ecc71]' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    📅 ประวัติแมตช์
                </button>
                <button 
                    onClick={() => setActiveTab('analytics')}
                    className={`min-h-11 pb-2 px-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'analytics' ? 'border-[#2ecc71] text-[#2ecc71]' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    📊 วิเคราะห์สถิติ
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
                    filterDate={filterDate}
                    setFilterDate={setFilterDate}
                    showSeason={selectedSeason === "all"}
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
                    <div className="grid grid-cols-2 mt-8 mb-2 border-b border-white/10">
                        <button 
                            onClick={() => setAnalyticsTab('partners')}
                            className={`min-h-11 pb-2 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center justify-center gap-2 ${analyticsTab === 'partners' ? 'border-green-500 text-green-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <span>🏆</span> คู่หูรู้ใจ
                        </button>
                        <button 
                            onClick={() => setAnalyticsTab('nemesis')}
                            className={`min-h-11 pb-2 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center justify-center gap-2 ${analyticsTab === 'nemesis' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-white'}`}
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
