export function RankGuide() {
    return (
        <div className="mt-16 mb-20">
            <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-3">
                    Rank <span className="text-green-500">Progression</span> Guide
                </h2>
                <div className="w-20 h-1 bg-green-500 mx-auto rounded-full mb-4" />
                <p className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-[0.3em]">เส้นทางแห่งเกียรติยศและชัยชนะ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { name: 'Bronze', divs: 'III, II, I', stars: 3, color: 'from-[#cd7f32] to-[#8b4513]', icon: '🥉', desc: 'ระดับเริ่มต้น (แพ้ไม่ลดดาว 🔰)', divArray: ['III', 'II', 'I'], noStarLoss: true },
                    { name: 'Silver', divs: 'III, II, I', stars: 3, color: 'from-slate-300 to-slate-500', icon: '🥈', desc: 'พิสูจน์ฝีมือก้าวสู่ระดับกลาง', divArray: ['III', 'II', 'I'] },
                    { name: 'Gold', divs: 'III, II, I', stars: 3, color: 'from-yellow-400 to-amber-600', icon: '🥇', desc: 'แมตช์ที่เข้มข้นขึ้นและความท้าทายใหม่', divArray: ['III', 'II', 'I'] },
                    { name: 'Platinum', divs: 'III, II, I', stars: 3, color: 'from-cyan-400 to-blue-600', icon: '💎', desc: 'ก้าวเข้าสู่ทำเนียบยอดฝีมือ', divArray: ['III', 'II', 'I'] },
                    { name: 'Diamond', divs: 'III, II, I', stars: 3, color: 'from-blue-600 to-indigo-800', icon: '💠', desc: 'ระดับสูงสุดก่อนเข้าสู่ทำเนียบแชมป์', divArray: ['III', 'II', 'I'] },
                    { name: 'Master', divs: 'Accumulate Stars', stars: '∞', color: 'from-red-500 to-purple-700', icon: '🏆', desc: 'ทำเนียบแชมป์เปี้ยนผู้ไร้ขีดจำกัด', isMaster: true, divArray: [] },
                ].map((r) => (
                    <div key={r.name} className="relative group">
                        <div className={`absolute -inset-0.5 bg-gradient-to-r ${r.color} rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500`}></div>
                        <div className="relative bg-[#1a2236] border border-white/5 rounded-3xl p-6 sm:p-8 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center text-3xl shadow-lg`}>
                                    {r.icon}
                                </div>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{r.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{r.desc}</p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Divisions</span>
                                        <span className="text-xs font-bold text-white">{r.divs}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {!r.isMaster ? (
                                            r.divArray.map((d) => (
                                                <div key={d} className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full w-full bg-gradient-to-r ${r.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-purple-500 to-red-500 rounded-full animate-pulse" />
                                        )}
                                    </div>
                                </div>

                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requirement</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-lg font-black text-white">{r.stars === '∞' ? 'Unlimited' : `${r.stars}`}</span>
                                            <span className="text-yellow-500">⭐</span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1"></span>
                                        </div>
                                    </div>
                                </div>

                                {r.noStarLoss && (
                                    <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                                        <span>🔰</span> ปลอดภัย: แพ้ไม่ลดดาว
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rules Note */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col items-center sm:items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-600/20">
                            🔰
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-1">
                                Bronze <span className="text-amber-400">Protection</span>
                            </h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                ระดับ <span className="text-amber-300 font-bold">Bronze (III, II, I)</span> ทั้งหมดเป็น Safe Zone พิเศษ! <span className="text-white font-bold">แพ้ไม่ลดดาว และไม่มีวันตกแรงค์</span> ช่วยให้ผู้เล่นใหม่ได้ฝึกฝนฝีมืออย่างเต็มที่
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-500/5 via-red-500/5 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col items-center sm:items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-3xl shadow-lg shadow-orange-600/20 animate-pulse">
                            🔥
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-1">
                                Win Streak <span className="text-orange-500">Bonus</span>
                            </h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                ชนะติดต่อกันครบ <span className="text-white font-bold">3 แมตช์ขึ้นไป</span> รับแต้มกล้าหาญเพิ่มขึ้น! ช่วยเร่งให้แต้มผู้กล้าเต็มเพื่อรับดาวโบนัสได้เร็วขึ้น
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col items-center sm:items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-600/20">
                            🛡️
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-1">
                                Brave Points & <span className="text-blue-400">Protection</span>
                            </h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                สำหรับระดับ <span className="text-white font-bold">Silver ขึ้นไป</span> สะสมแต้มกล้าหาญครบ 100 แต้ม รับ <span className="text-yellow-400 font-bold">ดาวโบนัส +1</span> หรือใช้ <span className="text-emerald-400 font-bold">ป้องกันดาวลดเมื่อแพ้</span> ได้ทันที
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
