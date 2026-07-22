import { useEffect } from "react";
import Swal from "sweetalert2";
import Pusher from 'pusher-js';
import { ApiMatch, User } from "@/app/tournament/TournamentTypes";

export function useMatchNotification(apiMatches: ApiMatch[], user: User | null) {
    useEffect(() => {
        if (!user || !user.id || apiMatches.length === 0) return;

        // Get notified matches from localStorage so we don't alert again on reload
        const notifiedKey = `notified_matches_${user.id}`;
        let notifiedMatches: number[] = [];
        try {
            notifiedMatches = JSON.parse(localStorage.getItem(notifiedKey) || "[]");
        } catch (e) {}

        // Find matches where user is a player and status is upcoming or live
        const userMatches = apiMatches.filter(m => {
            if (m.match_status === "cancelled" || m.match_status === "done") return false;
            
            const isTeamA = m.team_a_id?.team_players?.some(tp => tp.user_id?.id === user.id);
            const isTeamB = m.team_b_id?.team_players?.some(tp => tp.user_id?.id === user.id);
            
            return isTeamA || isTeamB;
        });

        // Check if any of these are new
        const newMatches = userMatches.filter(m => !notifiedMatches.includes(m.id));

        if (newMatches.length > 0) {
            // Prevent simultaneous alerts from Pusher and Polling
            const lastAlert = (window as any)._lastAlertTime || 0;
            if (Date.now() - lastAlert < 2000) return;
            (window as any)._lastAlertTime = Date.now();

            // Mark as notified
            const newIds = newMatches.map(m => m.id);
            localStorage.setItem(notifiedKey, JSON.stringify([...notifiedMatches, ...newIds]));

            // If it's a new match, let's trigger the alert.
            const match = newMatches[newMatches.length - 1]; // Alert the latest one

            // Figure out partner and opponents
            const isTeamA = match.team_a_id?.team_players?.some(tp => tp.user_id?.id === user.id);
            const myTeam = isTeamA ? match.team_a_id : match.team_b_id;
            const oppTeam = isTeamA ? match.team_b_id : match.team_a_id;

            const myPartnerCount = (myTeam?.team_players?.length || 0) - 1;
            const myPartner = myPartnerCount > 0 
                ? myTeam?.team_players?.filter(tp => tp.user_id?.id !== user.id).map(tp => tp.user_id?.username || tp.guest_name).join(" และ ") 
                : "ไม่มี (เล่นเดี่ยว)";
                
            const opponents = oppTeam?.team_players?.map(tp => tp.user_id?.username || tp.guest_name).filter(Boolean).join(" และ ") || "ยังไม่มีคู่แข่ง";

            // Vibrate (works on Android Chrome)
            if ("vibrate" in navigator) {
                navigator.vibrate([1000, 500, 1000]);
            }

            // Request Notification Permission and Show
            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("🏸 ถึงคิวคุณแข่งแล้ว!", {
                        body: `คู่ของคุณ: ${myPartner}\nคู่แข่ง: ${opponents}`
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission();
                }
            }

            // Swal Alert
            Swal.fire({
                title: '🏸 ถึงคิวคุณแข่งแล้ว!',
                html: `
                    <div class="mt-4 p-3 sm:p-4 bg-white/5 rounded-2xl border border-white/10 text-left space-y-3">
                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl shrink-0 mt-0.5">🤝</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">คู่ของคุณ</p>
                                <p class="text-white font-bold text-sm sm:text-base leading-snug break-words">${myPartner}</p>
                            </div>
                        </div>
                        <div class="h-px w-full bg-white/10 my-2"></div>
                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl shrink-0 mt-0.5">⚔️</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">พบกับ</p>
                                <p class="text-white font-bold text-sm sm:text-base leading-snug break-words">${opponents}</p>
                            </div>
                        </div>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'พร้อมลุย! 🏸',
                confirmButtonColor: '#6366f1',
                background: '#0f172a',
                color: '#f1f5f9',
                width: '92%',
                padding: '1.25em',
                customClass: {
                    popup: 'border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 rounded-3xl max-w-md',
                    title: 'text-lg sm:text-xl'
                }
            });
        }
    }, [apiMatches, user]);

    // Pusher Effect
    useEffect(() => {
        if (!user || !user.id) return;

        // Initialize Pusher Client
        const pusher = new Pusher("e1bc413c18f44323e541", {
            cluster: "ap1"
        });

        // We also subscribe to their email if available to cover both bases, but ID is the primary.
        const channelId = `user-${user.id}`;
        const channel = pusher.subscribe(channelId);
        
        const handleMatchAlert = (data: any) => {
            // Deduplicate: If we already notified about this match, skip
            if (data.matchId) {
                const notifiedKey = `notified_matches_${user.id}`;
                let notifiedMatches: number[] = [];
                try {
                    notifiedMatches = JSON.parse(localStorage.getItem(notifiedKey) || "[]");
                } catch (e) {}
                
                if (notifiedMatches.includes(data.matchId)) return;
                
                // Mark as notified so polling won't trigger it again
                localStorage.setItem(notifiedKey, JSON.stringify([...notifiedMatches, data.matchId]));
            }

            // Prevent simultaneous alerts from Pusher and Polling
            const lastAlert = (window as any)._lastAlertTime || 0;
            if (Date.now() - lastAlert < 2000) return;
            (window as any)._lastAlertTime = Date.now();

            const isTeamA = data.teamA.some((p: any) => p.id === user.id);
            const myTeam = isTeamA ? data.teamA : data.teamB;
            const oppTeam = isTeamA ? data.teamB : data.teamA;

            const myPartnerCount = (myTeam?.length || 0) - 1;
            const myPartner = myPartnerCount > 0 
                ? myTeam?.filter((p: any) => p.id !== user.id).map((p: any) => p.name).join(" และ ") 
                : "ไม่มี (เล่นเดี่ยว)";
                
            const opponents = oppTeam?.map((p: any) => p.name).filter(Boolean).join(" และ ") || "ยังไม่มีคู่แข่ง";

            if ("vibrate" in navigator) {
                navigator.vibrate([1000, 500, 1000]);
            }

            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("🏸 ถึงคิวคุณแข่งแล้ว! (Push)", {
                        body: `คู่ของคุณ: ${myPartner}\nคู่แข่ง: ${opponents}`
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission();
                }
            }

            Swal.fire({
                title: '🏸 ถึงคิวคุณแข่งแล้ว!',
                html: `
                    <div class="mt-4 p-3 sm:p-4 bg-white/5 rounded-2xl border border-white/10 text-left space-y-3">
                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl shrink-0 mt-0.5">🤝</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">คู่ของคุณ</p>
                                <p class="text-white font-bold text-sm sm:text-base leading-snug break-words">${myPartner}</p>
                            </div>
                        </div>
                        <div class="h-px w-full bg-white/10 my-2"></div>
                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl shrink-0 mt-0.5">⚔️</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">พบกับ</p>
                                <p class="text-white font-bold text-sm sm:text-base leading-snug break-words">${opponents}</p>
                            </div>
                        </div>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'พร้อมลุย! 🏸',
                confirmButtonColor: '#6366f1',
                background: '#0f172a',
                color: '#f1f5f9',
                width: '92%',
                padding: '1.25em',
                customClass: {
                    popup: 'border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 rounded-3xl max-w-md',
                    title: 'text-lg sm:text-xl'
                }
            });
        };

        channel.bind('match-alert', handleMatchAlert);

        // Also bind to email if available, just in case
        let emailChannel: any = null;
        if (user.email) {
            const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_');
            emailChannel = pusher.subscribe(`user-${safeEmail}`);
            emailChannel.bind('match-alert', handleMatchAlert);
        }

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            if (emailChannel) {
                emailChannel.unbind_all();
                emailChannel.unsubscribe();
            }
            pusher.disconnect();
        };
    }, [user]);
}
