import { TournamentDetailClient } from "@/features/tournaments/detail-components/TournamentDetailClient";

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentDetailClient id={id} />;
}
