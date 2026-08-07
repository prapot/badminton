import { NextResponse } from 'next/server';

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface TeamPlayer {
    user_id?: {
        id: number;
        username: string;
        picture?: { url: string } | null;
    };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const targetUserId = parseInt(userId, 10);
        
        if (isNaN(targetUserId)) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const seasonId = searchParams.get('seasonId');

        // Note: we can use a high pageSize to fetch all matches, or loop through pages.
        // For now, we'll fetch up to 500 latest match histories.
        let url = `${STRAPI_BASE_URL}/api/match-histories?filters[users][id]=${targetUserId}&populate[matches][populate][team_a_id][populate][team_players][populate][user_id][populate]=picture&populate[matches][populate][team_b_id][populate][team_players][populate][user_id][populate]=picture&populate[ranking][populate]=season&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=500`;

        if (seasonId && seasonId !== 'all') {
             url += `&filters[ranking][season][documentId][$eq]=${seasonId}`;
        }

        // We should pass authorization header if required, but Next.js API routes might need to forward the token
        // Let's get the token from the Authorization header of this request
        const authHeader = request.headers.get('authorization');

        const response = await fetch(url, {
            headers: authHeader ? { 'Authorization': authHeader } : {}
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Strapi');
        }

        const data = await response.json();
        const histories = data.data || [];

        const partnerStats: Record<number, { 
            partnerId: number; 
            username: string; 
            picture: string | null; 
            matchesPlayed: number; 
            wins: number 
        }> = {};

        histories.forEach((history: any) => {
            // A history contains matches (usually 1 match, but it's an array).
            // is_win is the result for the targetUserId in this specific history record.
            const isWin = history.is_win;

            const matches = history.matches || [];
            matches.forEach((match: any) => {
                const teamA = match.team_a_id?.team_players || [];
                const teamB = match.team_b_id?.team_players || [];

                // Check if targetUser is in teamA
                const inTeamA = teamA.some((p: TeamPlayer) => p.user_id?.id === targetUserId);
                const inTeamB = teamB.some((p: TeamPlayer) => p.user_id?.id === targetUserId);

                let myTeam: TeamPlayer[] = [];
                if (inTeamA) myTeam = teamA;
                else if (inTeamB) myTeam = teamB;

                // Only consider doubles (team has exactly 2 players)
                if (myTeam.length === 2) {
                    const partner = myTeam.find((p: TeamPlayer) => p.user_id && p.user_id.id !== targetUserId);
                    if (partner && partner.user_id) {
                        const pid = partner.user_id.id;
                        if (!partnerStats[pid]) {
                            partnerStats[pid] = {
                                partnerId: pid,
                                username: partner.user_id.username,
                                picture: partner.user_id.picture?.url || null,
                                matchesPlayed: 0,
                                wins: 0
                            };
                        }
                        partnerStats[pid].matchesPlayed += 1;
                        if (isWin) {
                            partnerStats[pid].wins += 1;
                        }
                    }
                }
            });
        });

        // Convert to array and calculate winRate
        let partnerList = Object.values(partnerStats).map(p => ({
            ...p,
            winRate: Math.round((p.wins / p.matchesPlayed) * 100)
        }));

        // Filter: only show partners with matchesPlayed > 1
        partnerList = partnerList.filter(p => p.matchesPlayed > 1);

        // Sort by winRate (desc), then matchesPlayed (desc)
        partnerList.sort((a, b) => {
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.matchesPlayed - a.matchesPlayed;
        });

        // Pagination
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        
        const total = partnerList.length;
        const pageCount = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedPartners = partnerList.slice(startIndex, startIndex + limit);

        return NextResponse.json({
            data: paginatedPartners,
            meta: {
                pagination: {
                    page,
                    limit,
                    total,
                    pageCount
                }
            }
        });

    } catch (error: any) {
        console.error('Error in partner analytics:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
