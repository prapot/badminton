"use client";

import React from "react";
import Navbar from "@/shared/components/Navbar";
import Footer from "@/shared/components/Footer";
import { useHomeData } from "../hooks/useHomeData";
import { HeroBanner } from "./HeroBanner";
import { StatsCards } from "./StatsCards";
import { TodayTournaments } from "./TodayTournaments";
import { UpcomingSchedule } from "./UpcomingSchedule";
import { NewsSection } from "./NewsSection";

export function HomeClient() {
  const { user, membersCount, todayTournaments, upcomingDays, loading, STRAPI_BASE_URL } = useHomeData();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <HeroBanner username={user.username} />
        
        <StatsCards 
          membersCount={membersCount} 
          todayCount={todayTournaments.length} 
          loading={loading} 
        />

        <div className="grid lg:grid-cols-2 gap-6">
          <TodayTournaments 
            tournaments={todayTournaments} 
            loading={loading} 
            baseUrl={STRAPI_BASE_URL} 
          />
          <UpcomingSchedule 
            upcomingDays={upcomingDays} 
            loading={loading} 
            baseUrl={STRAPI_BASE_URL} 
          />
        </div>

        <NewsSection />

        <Footer />
      </main>
    </div>
  );
}
