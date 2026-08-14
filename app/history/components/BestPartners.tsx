import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import Image from 'next/image';

interface BestPartnerData {
    partnerId: number;
    username: string;
    picture: string | null;
    matchesPlayed: number;
    wins: number;
    winRate: number;
}

interface BestPartnersProps {
    userId: string;
    selectedSeason: string;
}

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function BestPartners({ userId, selectedSeason }: BestPartnersProps) {
    const { jwt } = useAuth();
    const [partners, setPartners] = useState<BestPartnerData[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Reset page to 1 when season changes
    useEffect(() => {
        setPage(1);
    }, [selectedSeason]);

    useEffect(() => {
        if (!jwt) return;

        const fetchBestPartners = async () => {
            setLoading(true);
            setError(null);
            try {
                let url = `${STRAPI_BASE_URL}/api/match-histories/partner-analytics?userId=${userId}&pagination[page]=${page}&pagination[pageSize]=10`;
                if (selectedSeason !== "all") {
                    url += `&seasonId=${selectedSeason}`;
                }

                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${jwt}` }
                });

                if (!res.ok) throw new Error('Failed to fetch partner data');

                const data = await res.json();
                setPartners(data.data || []);
                setMeta(data.meta || null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBestPartners();
    }, [userId, jwt, selectedSeason, page]);

    if (loading && partners.length === 0) {
        return (
            <div className="bg-[#131e2b] rounded-2xl p-6 border border-white/5 shadow-xl mt-6">
                <h3 className="text-xl font-bold text-white mb-4">🏆 คู่หูรู้ใจ (Best Partners)</h3>
                <div className="animate-pulse flex flex-col gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 rounded-xl h-20 w-full"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
         return null; 
    }

    if (partners.length === 0 && page === 1) {
        return (
            <div className="bg-[#131e2b] rounded-2xl p-6 border border-white/5 shadow-xl mt-6">
                <h3 className="text-xl font-bold text-white mb-4">🏆 คู่หูรู้ใจ (Best Partners)</h3>
                <p className="text-slate-400 text-center py-6">ยังไม่มีข้อมูลคู่หูในฤดูกาลนี้</p>
            </div>
        );
    }

    const totalPartners = meta?.pagination?.total || 0;
    const pageCount = meta?.pagination?.pageCount || 1;

    return (
        <div className="bg-[#131e2b] rounded-2xl p-6 border border-white/5 shadow-xl mt-6">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🏆</span> คู่หูรู้ใจ (Best Partners)
                </h3>
                <p className="text-xs text-slate-400 font-medium bg-white/5 px-3 py-1 rounded-full">
                    มีคู่หูทั้งหมด {totalPartners} คน
                </p>
            </div>
            
            <div className={`flex flex-col gap-3 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {partners.map((partner, index) => {
                    const isFirst = index === 0 && page === 1;
                    return (
                        <div 
                            key={partner.partnerId} 
                            className={`relative rounded-xl p-4 flex items-center gap-4 transition-all ${isFirst ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/5 border border-green-500/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                        >
                            {isFirst && (
                                <div className="absolute -top-3 -right-3 text-2xl drop-shadow-md">👑</div>
                            )}
                            
                            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-bold text-base shrink-0 overflow-hidden border-2 border-[#131e2b] shadow-md">
                                {partner.picture ? (
                                    <Image 
                                        src={partner.picture.startsWith("http") ? partner.picture : `${STRAPI_BASE_URL}${partner.picture}`} 
                                        alt={partner.username} 
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    partner.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h4 className="font-semibold text-white truncate text-base">{partner.username}</h4>
                                    <span className="text-xs text-slate-400 truncate mt-0.5">
                                        ชนะ {partner.wins}/{partner.matchesPlayed} แมทช์
                                    </span>
                                </div>
                                <div className="text-sm font-bold px-3 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                                    {partner.winRate}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {pageCount > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button 
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        ก่อนหน้า
                    </button>
                    <span className="text-xs text-slate-400 font-medium">
                        หน้าที่ {page} / {pageCount}
                    </span>
                    <button 
                        disabled={page >= pageCount}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        ถัดไป
                    </button>
                </div>
            )}
        </div>
    );
}
