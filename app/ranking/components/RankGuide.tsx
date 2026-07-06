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
                    { name: 'Bronze', divs: 'III, II, I', stars: 3, color: 'from-[#cd7f32] to-[#8b4513]', icon: '🥉', desc: 'ระดับเริ่มต้นเพื่อฝึกฝนทักษะ', divArray: ['III', 'II', 'I'] },
                    { name: 'Silver', divs: 'III, II, I', stars: 4, color: 'from-slate-300 to-slate-500', icon: '🥈', desc: 'พิสูจน์ฝีมือก้าวสู่ระดับกลาง', divArray: ['III', 'II', 'I'] },
                    { name: 'Gold', divs: 'IV, III, II, I', stars: 4, color: 'from-yellow-400 to-amber-600', icon: '🥇', desc: 'แมตช์ที่เข้มข้นขึ้นและความท้าทายใหม่', divArray: ['IV', 'III', 'II', 'I'] },
                    { name: 'Platinum', divs: 'V, IV, III, II, I', stars: 5, color: 'from-cyan-400 to-blue-600', icon: '💎', desc: 'ก้าวเข้าสู่ทำเนียบยอดฝีมือ', divArray: ['V', 'IV', 'III', 'II', 'I'] },
                    { name: 'Diamond', divs: 'V, IV, III, II, I', stars: 5, color: 'from-blue-600 to-indigo-800', icon: '💠', desc: 'ระดับสูงสุดก่อนเข้าสู่ทำเนียบแชมป์', divArray: ['V', 'IV', 'III', 'II', 'I'] },
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
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rules Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-500/5 via-red-500/5 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row gap-6 items-center">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-3xl shadow-lg shadow-orange-600/20 animate-pulse">
                            🔥
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-tighter mb-1">
                                Win Streak <span className="text-orange-500">Bonus</span>
                            </h3>
                            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                                ชนะติดต่อกันครบ <span className="text-white font-bold">3 แมตช์</span> รับแต้มกล้าหาญเพิ่มขึ้น! ช่วยให้คุณข้ามดิวิชั่นได้ไวขึ้น
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row gap-6 items-center">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-600/20">
                            🛡️
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-tighter mb-1">
                                Brave Points & <span className="text-blue-400">Protection</span>
                            </h3>
                            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                                สะสมแต้มกล้าหาญครบ 100 แต้ม เพื่อรับ <span className="text-yellow-400 font-bold">ดาวโบนัส +1</span> หรือใช้ป้องกัน <span className="text-red-400 font-bold">ดาวลดเมื่อแพ้</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
