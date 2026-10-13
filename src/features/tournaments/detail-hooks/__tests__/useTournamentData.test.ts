import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTournamentData } from "../useTournamentData";

vi.mock("@/shared/realtime/pusherClient", () => ({ getPusher: () => null }));

type Deferred = { url: string; resolve: (body: unknown) => void };

describe("useTournamentData", () => {
    let pending: Deferred[];

    beforeEach(() => {
        pending = [];
        vi.stubGlobal("fetch", vi.fn((url: string) => new Promise((resolve) => {
            pending.push({ url, resolve: (body) => resolve({ json: () => Promise.resolve(body) }) });
        })));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const tournament = { data: { name: "T", tournament_status: "upcoming", format: "endless_mode", tournament_players: [] } };
    const matchesRequests = () => pending.filter((p) => p.url.includes("/api/matches"));

    it("ignores a matches response that arrives after a newer one", async () => {
        const { result } = renderHook(() => useTournamentData("t1", "jwt"));
        await act(async () => pending[0].resolve(tournament));
        await waitFor(() => expect(result.current.tournamentInfo).not.toBeNull());

        let older!: Promise<void>, newer!: Promise<void>;
        act(() => {
            older = result.current.fetchMatches();   // e.g. polling, started before the match was created
            newer = result.current.fetchMatches();   // refresh after creating the match
        });
        const [olderReq, newerReq] = matchesRequests();

        const freshMatch = { id: 2, match_status: "upcoming" };
        await act(async () => { newerReq.resolve({ data: [freshMatch] }); await newer; });
        expect(result.current.apiMatches).toEqual([freshMatch]);

        await act(async () => { olderReq.resolve({ data: [] }); await older; });
        expect(result.current.apiMatches).toEqual([freshMatch]);
    });

    it("ignores a tournament refresh that arrives after a newer one", async () => {
        const { result } = renderHook(() => useTournamentData("t1", "jwt"));
        await act(async () => pending[0].resolve(tournament));
        await waitFor(() => expect(result.current.tournamentInfo).not.toBeNull());

        const player = (is_paused: boolean) => ({
            data: { ...tournament.data, tournament_players: [{ id: 1, is_paused, user: { id: 7, username: "a", email: "" } }] },
        });

        let older!: Promise<void>, newer!: Promise<void>;
        act(() => {
            older = result.current.refreshInfo();
            newer = result.current.refreshInfo();
        });
        const [, olderReq, newerReq] = pending;

        await act(async () => { newerReq.resolve(player(true)); });
        await act(async () => { olderReq.resolve(player(false)); await older; });
        expect(result.current.tournamentInfo?.players[0].is_paused).toBe(true);
        // Only the newer refresh goes on to fetch matches
        expect(matchesRequests()).toHaveLength(1);
        await act(async () => { matchesRequests()[0].resolve({ data: [] }); await newer; });
    });
});
