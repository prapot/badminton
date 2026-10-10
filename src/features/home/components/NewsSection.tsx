import React from "react";

const news = [
  { title: "เปิดรับสมัครทัวร์นาเมนต์ประจำเดือน มีนาคม 2026", date: "25 ก.พ. 2026", tag: "ทัวร์นาเมนต์" },
  { title: "ระเบียบการใช้สนามใหม่ 2026 โปรดอ่านก่อนจอง", date: "20 ก.พ. 2026", tag: "ประกาศ" },
  { title: "Workshop การจับแร็กเก็ตอย่างถูกวิธี โดยโค้ชมืออาชีพ", date: "18 ก.พ. 2026", tag: "อบรม" },
];

export const NewsSection = () => (
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
);
