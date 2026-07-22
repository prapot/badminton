import { NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
    appId: "790807",
    key: "e1bc413c18f44323e541",
    secret: "b0e17018db0dad0c62dd",
    cluster: "ap1",
    useTLS: true
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { playerIds, matchData } = body;

        if (!playerIds || !Array.isArray(playerIds)) {
            return NextResponse.json({ error: "Invalid playerIds" }, { status: 400 });
        }

        // Trigger notification event for each player involved in the match
        // We use their ID to form their unique channel.
        const triggerPromises = playerIds.map((id: number | string) => {
            return pusher.trigger(`user-${id}`, 'match-alert', matchData);
        });

        await Promise.all(triggerPromises);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Pusher error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
