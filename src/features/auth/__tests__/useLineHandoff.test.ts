import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockFetch } from "./lineTestUtils";

vi.hoisted(() => {
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL = "http://strapi.test";
});

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { useLineHandoff } from "../useLineHandoff";

const HANDOFF_KEY = "line_auth_handoff";
const startedHere = () => localStorage.setItem(HANDOFF_KEY, JSON.stringify({ id: "h1", createdAt: Date.now() }));

describe("useLineHandoff (login page)", () => {
    beforeEach(() => {
        replace.mockReset();
        localStorage.clear();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("does nothing when this tab never started a LINE sign-in", async () => {
        const fetchMock = mockFetch({});
        const { result } = renderHook(() => useLineHandoff("/"));
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10));
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current.waiting).toBe(false);
    });

    it("picks up a session finished in another browser and goes to the redirect", async () => {
        startedHere();
        mockFetch({
            "/api/line-auth/handoff/h1": { body: { status: "done", jwt: "jwt-7" } },
            "/api/users/me": { body: { id: 7, username: "kai" } },
        });

        renderHook(() => useLineHandoff("/tournament/abc"));

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/tournament/abc"));
        expect(localStorage.getItem("jwt")).toBe("jwt-7");
        expect(localStorage.getItem(HANDOFF_KEY)).toBeNull();
    });

    it("shows waiting and checks again until the sign-in finishes", async () => {
        startedHere();
        let finished = false;
        const fetchMock = vi.fn(async (url: string) => {
            const body = url.endsWith("/users/me")
                ? { id: 7 }
                : finished ? { status: "done", jwt: "jwt-7" } : { status: "pending" };
            return { ok: true, status: 200, json: async () => body } as Response;
        });
        vi.stubGlobal("fetch", fetchMock);

        const { result } = renderHook(() => useLineHandoff("/"));
        await waitFor(() => expect(result.current.waiting).toBe(true));
        expect(replace).not.toHaveBeenCalled();

        finished = true;
        await waitFor(() => expect(replace).toHaveBeenCalledWith("/"), { timeout: 4000 });
        expect(result.current.waiting).toBe(false);
    });

    it("checks when the page is shown again (back button / bfcache), even if nothing was pending at first", async () => {
        mockFetch({
            "/api/line-auth/handoff/h1": { body: { status: "done", jwt: "jwt-7" } },
            "/api/users/me": { body: { id: 7 } },
        });
        renderHook(() => useLineHandoff("/"));
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10));
        });
        expect(replace).not.toHaveBeenCalled();

        // user pressed the LINE button (handoff saved), went to LINE, then came back
        startedHere();
        act(() => {
            window.dispatchEvent(new Event("pageshow"));
        });
        await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    });

    it("cancel stops waiting and forgets the handoff", async () => {
        startedHere();
        mockFetch({ "/api/line-auth/handoff/h1": { body: { status: "pending" } } });
        const { result } = renderHook(() => useLineHandoff("/"));
        await waitFor(() => expect(result.current.waiting).toBe(true));

        act(() => result.current.cancel());

        expect(result.current.waiting).toBe(false);
        expect(localStorage.getItem(HANDOFF_KEY)).toBeNull();
    });
});
