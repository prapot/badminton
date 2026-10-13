import { StrictMode, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callTo, mockFetch, strapiError, stubLocation } from "./lineTestUtils";

vi.hoisted(() => {
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL = "http://strapi.test";
});

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace }),
    useSearchParams: () => searchParams,
}));

import { useLineCallback } from "../useLineCallback";

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
const user = { id: 7, username: "kai" };

describe("useLineCallback", () => {
    beforeEach(() => {
        replace.mockReset();
        localStorage.clear();
        stubLocation();
        searchParams = new URLSearchParams({ code: "code-1", state: "s1" });
    });
    afterEach(() => vi.unstubAllGlobals());

    it("works with empty browser storage (iOS: the LINE app opens the callback in its own browser)", async () => {
        const fetchMock = mockFetch({
            "/api/line-auth/callback": { body: { result: "login", jwt: "jwt-7", redirect: "/tournament/abc" } },
            "/api/users/me": { body: user },
        });

        renderHook(() => useLineCallback());

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/tournament/abc"));
        expect(JSON.parse(callTo(fetchMock, "/api/line-auth/callback")![1].body!)).toEqual({ code: "code-1", state: "s1" });
        expect(localStorage.getItem("jwt")).toBe("jwt-7");
        expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
    });

    it("login in the same browser clears the pending handoff so the login page doesn't claim it again", async () => {
        localStorage.setItem("line_auth_handoff", JSON.stringify({ id: "h1", createdAt: Date.now() }));
        mockFetch({
            "/api/line-auth/callback": { body: { result: "login", jwt: "jwt-7", redirect: "/" } },
            "/api/users/me": { body: user },
        });

        renderHook(() => useLineCallback());

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
        expect(localStorage.getItem("line_auth_handoff")).toBeNull();
    });

    it("never follows an off-site redirect from the response", async () => {
        mockFetch({
            "/api/line-auth/callback": { body: { result: "login", jwt: "jwt-7", redirect: "//evil.example" } },
            "/api/users/me": { body: user },
        });
        renderHook(() => useLineCallback());
        await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    });

    it("exchanges the one-time code only once under StrictMode", async () => {
        const fetchMock = mockFetch({
            "/api/line-auth/callback": { body: { result: "login", jwt: "jwt-7", redirect: "/" } },
            "/api/users/me": { body: user },
        });

        renderHook(() => useLineCallback(), { wrapper: strict });

        await waitFor(() => expect(replace).toHaveBeenCalled());
        expect(fetchMock.mock.calls.filter(([url]) => url.includes("/line-auth/callback"))).toHaveLength(1);
    });

    it("unlinked LINE account: offers new account / existing account, with the handoff id", async () => {
        mockFetch({
            "/api/line-auth/callback": {
                body: { result: "not_linked", linkTicket: "ticket-1", displayName: "Kai", redirect: "/tournament/abc", handoffId: "h1" },
            },
        });

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.pendingLink).not.toBeNull());
        expect(result.current.pendingLink).toEqual({
            linkTicket: "ticket-1",
            displayName: "Kai",
            redirect: "/tournament/abc",
            handoffId: "h1",
        });
        expect(replace).not.toHaveBeenCalled();
        expect(localStorage.getItem("jwt")).toBeNull();
    });

    it("link finished in the browser that is signed in: back to the profile", async () => {
        localStorage.setItem("jwt", "jwt-7");
        mockFetch({ "/api/line-auth/callback": { body: { result: "linked", displayName: "Kai", redirect: "/profile" } } });

        renderHook(() => useLineCallback());

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
    });

    it("link finished in another browser (not signed in here): says to go back to the original page", async () => {
        mockFetch({ "/api/line-auth/callback": { body: { result: "linked", displayName: "Kai", redirect: "/profile" } } });

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.linkedElsewhere).toBe("Kai"));
        expect(replace).not.toHaveBeenCalled();
    });

    it("user cancelled on LINE: shows a cancel message without calling the backend", async () => {
        searchParams = new URLSearchParams({ error: "access_denied", state: "s1" });
        const fetchMock = mockFetch({});

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.error).toBe("ยกเลิกการเข้าสู่ระบบด้วย LINE"));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("unknown/expired/forged state: shows the backend's message", async () => {
        mockFetch({ "/api/line-auth/callback": strapiError(400, "การเข้าสู่ระบบด้วย LINE หมดอายุแล้ว") });

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.error).toBe("การเข้าสู่ระบบด้วย LINE หมดอายุแล้ว"));
        expect(localStorage.getItem("jwt")).toBeNull();
    });
});
