"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface Match {
  id: number;
  scheduledAt: string;
  match_no: number;
  match_status: string;
  score_a?: number;
  score_b?: number;
  team_a_id?: {
    name: string;
    team_players: Array<{ user_id?: { username: string } }>;
  };
  team_b_id?: {
    name: string;
    team_players: Array<{ user_id?: { username: string } }>;
  };
}

interface Tournament {
  id: number;
  documentId: string;
  name: string;
  type: string;
  startDate: string;
  tournament_status: string;
  matches?: Match[];
  tournament_players?: any[];
  tournament_players_count?: number;
}

const news = [
  { title: "เปิดรับสมัครทัวร์นาเมนต์ประจำเดือน มีนาคม 2026", date: "25 ก.พ. 2026", tag: "ทัวร์นาเมนต์" },
  { title: "ระเบียบการใช้สนามใหม่ 2026 โปรดอ่านก่อนจอง", date: "20 ก.พ. 2026", tag: "ประกาศ" },
  { title: "Workshop การจับแร็กเก็ตอย่างถูกวิธี โดยโค้ชมืออาชีพ", date: "18 ก.พ. 2026", tag: "อบรม" },
];

export default function HomePage() {
  const { user, jwt } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membersCount, setMembersCount] = useState(0);
  const [todayTournaments, setTodayTournaments] = useState<Tournament[]>([]);
  const [expandedTourney, setExpandedTourney] = useState<number | null>(null);
  const [upcomingDays, setUpcomingDays] = useState<{ date: string; label: string; items: any[] }[]>([]);

  useEffect(() => {
    if (jwt) {
      fetchHomeData();
    }
  }, [jwt]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      // 1. Members count
      const rankingsRes = await fetch(`${STRAPI_BASE_URL}/api/rankings?pagination[pageSize]=1`, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      const rankingsData = await rankingsRes.json();
      setMembersCount(rankingsData.meta?.pagination?.total || 0);

      // Current Time for filters (UTC+7 Thailand)
      const getTHDateStr = (date: Date) => {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date);
      };

      const now = new Date();
      const todayDateStr = getTHDateStr(now);

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDateStr = getTHDateStr(tomorrow);

      // 2. Today's Tournaments (Accordion)
      const todayTourneysRes = await fetch(
        `${STRAPI_BASE_URL}/api/tournaments?filters[$or][0][startDate]=${todayDateStr}&filters[$or][1][tournament_status]=ongoing&populate[matches][populate][team_a_id][populate][team_players][populate]=user_id&populate[matches][populate][team_b_id][populate][team_players][populate]=user_id&populate[tournament_players][count]=true`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const todayTourneysData = await todayTourneysRes.json();
      const mappedToday = (todayTourneysData.data || []).map((t: any) => ({
        ...t,
        tournament_players_count: t.tournament_players?.count || 0
      }));
      setTodayTournaments(mappedToday);
      if (mappedToday.length > 0) {
        setExpandedTourney(mappedToday[0].id);
      }

      // 3. Upcoming 5 days
      const in5Days = new Date(now);
      in5Days.setDate(in5Days.getDate() + 6);
      const in5DaysStr = getTHDateStr(in5Days);

      const upcomingTourneysRes = await fetch(
        `${STRAPI_BASE_URL}/api/tournaments?filters[startDate][$gte]=${tomorrowDateStr}&filters[startDate][$lt]=${in5DaysStr}&sort[0]=startDate:asc&populate[tournament_players][count]=true`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const tourneysData = await upcomingTourneysRes.json();
      const upcomingItems = (tourneysData.data || []).map((t: any) => ({
        ...t,
        tournament_players_count: t.tournament_players?.count || 0
      }));

      const days = [];
      for (let i = 1; i < 6; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const dStr = getTHDateStr(d);

        const dayTourneys = upcomingItems.filter((t: any) => t.startDate === dStr);

        if (dayTourneys.length > 0) {
          days.push({
            date: dStr,
            label: i === 1 ? "พรุ่งนี้" : d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }),
            items: dayTourneys.map((t: any) => ({ ...t, kind: 'tournament' }))
          });
        }
      }
      setUpcomingDays(days);

    } catch (error) {
      console.error("Home fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2d20] to-[#0f1923] border border-white/10 p-8 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice">
              <rect x="50" y="20" width="800" height="260" fill="none" stroke="#2ecc71" strokeWidth="2" />
              <line x1="450" y1="20" x2="450" y2="280" stroke="#2ecc71" strokeWidth="3" />
            </svg>
          </div>
          <div className="absolute top-4 right-8 text-8xl opacity-10 select-none">🏸</div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              ระบบออนไลน์
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              ยินดีต้อนรับ, {user.username}! 🎉
            </h2>
            <p className="text-slate-400 max-w-xl">
              จัดการสนามแบดมินตัน ดูตารางการแข่งขัน และติดตามผลลัพธ์ได้ที่นี่
            </p>
            <div className="flex items-center gap-3 mt-5">
              <Link href="/tournament" className="px-5 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30 hover:scale-[1.02]">
                ทัวร์นาเมนต์
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col gap-3 group hover:border-blue-500/40 transition-all">
            <span className="text-2xl group-hover:scale-110 transition-transform">👥</span>
            <div>
              <p className="text-2xl font-bold text-white">{loading ? "..." : membersCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">สมาชิก</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-5 flex flex-col gap-3 group hover:border-yellow-500/40 transition-all">
            <span className="text-2xl group-hover:scale-110 transition-transform">⚡</span>
            <div>
              <p className="text-2xl font-bold text-white">{loading ? "..." : todayTournaments.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">ทัวร์นาเมนต์วันนี้</p>
            </div>
          </div>
        </div>

        {/* Today's matches + Upcoming Days Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Today's Tournaments (Accordion) */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">⚡</span>
                แมตช์วันนี้
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-white/5 px-2 py-1 rounded-md">TODAY</span>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)
              ) : todayTournaments.length > 0 ? (
                todayTournaments.map((t) => (
                  <div key={t.id} className={`overflow-hidden rounded-2xl border transition-all duration-300 ${expandedTourney === t.id ? 'bg-white/8 border-green-500/30' : 'bg-white/3 border-white/5 hover:border-white/20'}`}>
                    <div className="w-full flex items-center justify-between p-4 group" onClick={() => setExpandedTourney(expandedTourney === t.id ? null : t.id)}>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white group-hover:text-green-400 transition-colors">{t.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {(() => {
                              const cfg: Record<string, { label: string; cls: string }> = {
                                ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" },
                                upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                completed: { label: "จบแล้ว", cls: "bg-white/5 text-slate-400 border-white/10" },
                              };
                              const s = cfg[t.tournament_status] ?? cfg.upcoming;
                              return (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
                                  {s.label}
                                </span>
                              );
                            })()}
                            <p className="text-[10px] text-slate-500 font-medium">
                              {t.type === 'double' ? '👥 คู่' : '👤 เดี่ยว'} · {t.tournament_players_count || 0} คนลงแข่ง
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/tournament/${t.documentId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden sm:block text-[10px] text-slate-500 hover:text-white font-bold uppercase tracking-tight bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 transition-all"
                        >
                          Detail ➜
                        </Link>
                        <svg className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${expandedTourney === t.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {expandedTourney === t.id && (
                      <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                        {t.matches && t.matches.length > 0 ? (
                          [...t.matches]
                            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                            .map((m) => {
                              const teamANames = m.team_a_id?.team_players?.map(tp => tp.user_id?.username).filter(Boolean).join(" / ") || m.team_a_id?.name || "รอยืนยัน";
                              const teamBNames = m.team_b_id?.team_players?.map(tp => tp.user_id?.username).filter(Boolean).join(" / ") || m.team_b_id?.name || "รอยืนยัน";
                              const isDone = m.match_status === 'done';

                              return (
                                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                                  <div className="text-center w-12 shrink-0 border-r border-white/10 pr-3">
                                    <p className="text-[10px] font-bold text-green-400">
                                      {m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : `M#${m.match_no}`}
                                    </p>
                                  </div>
                                  <div className="flex-1 min-w-0 flex items-center justify-between px-2 gap-2">
                                    <span className="text-xs text-white font-medium truncate flex-1 text-right">{teamANames}</span>
                                    {isDone ? (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/30 rounded-lg border border-white/10 shrink-0">
                                        <span className={`text-xs font-black ${m.score_a! > m.score_b! ? 'text-green-400' : 'text-white'}`}>{m.score_a}</span>
                                        <span className="text-[10px] text-slate-600 font-bold">:</span>
                                        <span className={`text-xs font-black ${m.score_b! > m.score_a! ? 'text-green-400' : 'text-white'}`}>{m.score_b}</span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-600 italic shrink-0">vs</span>
                                    )}
                                    <span className="text-xs text-white font-medium truncate flex-1 text-left">{teamBNames}</span>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${m.match_status === 'live' ? 'bg-red-500/20 text-red-400 animate-pulse border-red-500/30' : isDone ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-green-500/20 text-green-400 border-green-500/30'
                                      } border uppercase`}>
                                      {m.match_status === 'done' ? 'จบ' : m.match_status === 'live' ? 'สด' : 'รอ'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="text-center py-4 text-[10px] text-slate-500 italic">ยังไม่มีแมตช์ที่ลงทะเบียนสำหรับวันนี้</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white/3 rounded-3xl border border-white/5">
                  <span className="text-3xl block mb-2 opacity-50">🏟️</span>
                  <p className="text-sm text-slate-500">ไม่มีทัวร์นาเมนต์เปิดวันนี้</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming 5 Days Schedule */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">📅</span>
                ตารางล่วงหน้า (5 วัน)
              </h3>
            </div>

            <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[15px] before:w-[2px] before:bg-white/5 before:z-0">
              {loading ? (
                Array(2).fill(0).map((_, i) => <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl ml-8" />)
              ) : upcomingDays.length > 0 ? (
                upcomingDays.map((day) => (
                  <div key={day.date} className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#0f1923] border-2 border-slate-700 flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{day.label}</p>
                    </div>

                    <div className="space-y-3 ml-8">
                      {day.items.map((item: any) => (
                        <Link
                          key={item.id}
                          href={`/tournament/${item.documentId}`}
                          className="group block"
                        >
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/8 hover:border-blue-500/30 transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{item.name}</p>
                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 font-medium">
                                  <span className="flex items-center gap-1">
                                    {item.type === 'double' ? '👥 คู่' : '👤 เดี่ยว'}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                  <span>ผู้ลงแข่ง: {item.tournament_players_count || 0} คน</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const cfg: Record<string, { label: string; cls: string }> = {
                                  ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" },
                                  upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                  completed: { label: "จบแล้ว", cls: "bg-white/5 text-slate-400 border-white/10" },
                                };
                                const s = cfg[item.tournament_status] ?? cfg.upcoming;
                                return (
                                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${s.cls}`}>
                                    {s.label}
                                  </span>
                                );
                              })()}
                              <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-tighter">View Detail ➜</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white/3 rounded-3xl border border-white/5 ml-8">
                  <p className="text-sm text-slate-500">ยังไม่มีรายการล่วงหน้า</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* News */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">📢</span>
            ข่าวสารและประกาศ
          </h3>
          <div className="divide-y divide-white/5">
            {news.map((n, i) => (
              <div key={i} className="py-4 flex items-start justify-between gap-4 group cursor-pointer hover:bg-white/2 px-2 -mx-2 rounded-xl transition-all">
                <div>
                  <p className="text-sm text-slate-200 group-hover:text-white transition-colors leading-snug font-medium">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                    {n.date}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-tight">
                  {n.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pt-8 pb-4">
          🏸 Badminton Club Management System · {new Date().getFullYear()}
        </div>
      </main>
    </div>
  );
}
