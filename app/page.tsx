"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  email: string;
}

const stats = [
  { label: "สนามทั้งหมด", value: "8", icon: "🏟️", color: "from-green-500/20 to-emerald-500/10", border: "border-green-500/20" },
  { label: "สมาชิก", value: "124", icon: "👥", color: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/20" },
  { label: "แมตช์วันนี้", value: "12", icon: "⚡", color: "from-yellow-500/20 to-amber-500/10", border: "border-yellow-500/20" },
  { label: "แชมป์เปี้ยน", value: "6", icon: "🏆", color: "from-purple-500/20 to-violet-500/10", border: "border-purple-500/20" },
];

const courts = [
  { id: 1, name: "สนาม A", status: "ว่าง", time: "09:00 - 11:00", color: "bg-green-500/20 text-green-400" },
  { id: 2, name: "สนาม B", status: "มีคนจอง", time: "10:00 - 12:00", color: "bg-red-500/20 text-red-400" },
  { id: 3, name: "สนาม C", status: "ว่าง", time: "11:00 - 13:00", color: "bg-green-500/20 text-green-400" },
  { id: 4, name: "สนาม D", status: "กำลังเล่น", time: "09:30 - 10:30", color: "bg-yellow-500/20 text-yellow-400" },
];

const upcoming = [
  { player1: "ณัฐ", player2: "กร", court: "สนาม A", time: "10:00", level: "A" },
  { player1: "พลอย", player2: "ใหม่", court: "สนาม C", time: "10:30", level: "B" },
  { player1: "โอม", player2: "ต้น", court: "สนาม B", time: "11:00", level: "A+" },
];

const news = [
  { title: "เปิดรับสมัครทัวร์นาเมนต์ประจำเดือน มีนาคม 2026", date: "25 ก.พ. 2026", tag: "ทัวร์นาเมนต์" },
  { title: "ระเบียบการใช้สนามใหม่ 2026 โปรดอ่านก่อนจอง", date: "20 ก.พ. 2026", tag: "ประกาศ" },
  { title: "Workshop การจับแร็กเก็ตอย่างถูกวิธี โดยโค้ชมืออาชีพ", date: "18 ก.พ. 2026", tag: "อบรม" },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      router.push("/login");
      return;
    }
    if (stored) setUser(JSON.parse(stored));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-[#0f1923]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-lg">
              🏸
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Badminton Club</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">
              สวัสดี, <span className="text-white font-medium">{user.username}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2d20] to-[#0f1923] border border-white/10 p-8">
          {/* Court lines decoration */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice">
              <rect x="50" y="20" width="800" height="260" fill="none" stroke="#2ecc71" strokeWidth="2" />
              <line x1="450" y1="20" x2="450" y2="280" stroke="#2ecc71" strokeWidth="3" />
              <line x1="50" y1="100" x2="450" y2="100" stroke="#2ecc71" strokeWidth="1.5" />
              <line x1="450" y1="180" x2="850" y2="180" stroke="#2ecc71" strokeWidth="1.5" />
              <line x1="250" y1="100" x2="250" y2="180" stroke="#2ecc71" strokeWidth="1" />
              <line x1="650" y1="100" x2="650" y2="180" stroke="#2ecc71" strokeWidth="1" />
              <line x1="80" y1="20" x2="80" y2="280" stroke="#2ecc71" strokeWidth="1" />
              <line x1="820" y1="20" x2="820" y2="280" stroke="#2ecc71" strokeWidth="1" />
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
              <button className="px-5 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-900/30">
                จองสนาม
              </button>
              <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-300 font-medium rounded-xl transition-all duration-200">
                ดูตาราง
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl p-5 flex flex-col gap-3`}
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Courts + Upcoming Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Court status */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>🏟️</span> สถานะสนาม
              </h3>
              <span className="text-xs text-slate-500">วันนี้</span>
            </div>
            <div className="space-y-3">
              {courts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.time}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.color}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming matches */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>⚡</span> แมตช์ที่กำลังจะมาถึง
              </h3>
              <span className="text-xs text-slate-500">วันนี้</span>
            </div>
            <div className="space-y-3">
              {upcoming.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="text-center w-12 shrink-0">
                    <p className="text-xs font-bold text-green-400">{m.time}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{m.court}</p>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{m.player1}</span>
                    <span className="text-xs text-slate-500 mx-2">vs</span>
                    <span className="text-sm text-white font-medium">{m.player2}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 border border-green-500/20">
                    {m.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* News */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>📢</span> ข่าวสารและประกาศ
          </h3>
          <div className="divide-y divide-white/5">
            {news.map((n, i) => (
              <div key={i} className="py-3.5 flex items-start justify-between gap-4 group cursor-pointer">
                <div>
                  <p className="text-sm text-slate-200 group-hover:text-white transition-colors leading-snug">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{n.date}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  {n.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pb-4">
          🏸 Badminton Club Management System · {new Date().getFullYear()}
        </div>
      </main>
    </div>
  );
}
