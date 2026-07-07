"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRankingData } from "./hooks/useRankingData";
import { LeaderboardHeader } from "./components/LeaderboardHeader";
import { LeaderboardView } from "./components/LeaderboardView";
import { RankGuide } from "./components/RankGuide";

export default function RankingPage() {
    const { user, loading, seasons, selectedSeason, setSelectedSeason, allPlayers } = useRankingData();

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                
                <LeaderboardHeader totalPlayers={allPlayers.length} />

                <LeaderboardView 
                    allPlayers={allPlayers}
                    seasons={seasons}
                    selectedSeason={selectedSeason}
                    setSelectedSeason={setSelectedSeason}
                    loading={loading}
                    user={user}
                />

                <RankGuide />
                
            </main>
            <Footer />
        </div>
    );
}
