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

function setPending(mode: "login" | "link", redirect: string) {
    sessionStorage.setItem("line_auth_pending", JSON.stringify({ state: "s1", nonce: "n1", codeVerifier: "v1", mode, redirect }));
}

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

describe("useLineCallback", () => {
    beforeEach(() => {
        replace.mockReset();
        sessionStorage.clear();
        localStorage.clear();
        stubLocation();
        searchParams = new URLSearchParams({ code: "code-1", state: "s1" });
    });
    afterEach(() => vi.unstubAllGlobals());

    it("login: stores the session and goes back to the original page", async () => {
        setPending("login", "/tournament/abc");
        const user = { id: 7, username: "kai" };
        mockFetch({
            "/api/line-auth/login": { body: { jwt: "jwt-7" } },
            "/api/users/me": { body: user },
        });

        renderHook(() => useLineCallback());

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/tournament/abc"));
        expect(localStorage.getItem("jwt")).toBe("jwt-7");
        expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
    });

    it("exchanges the one-time code only once under StrictMode", async () => {
        setPending("login", "/");
        const fetchMock = mockFetch({
            "/api/line-auth/login": { body: { jwt: "jwt-7" } },
            "/api/users/me": { body: { id: 7 } },
        });

        renderHook(() => useLineCallback(), { wrapper: strict });

        await waitFor(() => expect(replace).toHaveBeenCalled());
        expect(fetchMock.mock.calls.filter(([url]) => url.includes("/line-auth/login"))).toHaveLength(1);
    });

    it("login with an unlinked LINE account: offers linking instead of an error", async () => {
        setPending("login", "/tournament/abc");
        mockFetch({
            "/api/line-auth/login": strapiError(404, "ยังไม่ได้เชื่อมต่อ", {
                code: "LINE_NOT_LINKED",
                linkTicket: "ticket-1",
                displayName: "Kai",
            }),
        });

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.pendingLink).not.toBeNull());
        expect(result.current.pendingLink).toEqual({ linkTicket: "ticket-1", displayName: "Kai", redirect: "/tournament/abc" });
        expect(result.current.error).toBeNull();
        expect(replace).not.toHaveBeenCalled();
        expect(localStorage.getItem("jwt")).toBeNull();
    });

    it("link: links with the stored JWT and returns to the profile", async () => {
        setPending("link", "/profile");
        localStorage.setItem("jwt", "jwt-7");
        const fetchMock = mockFetch({ "/api/line-auth/link": { body: { linked: true, displayName: "Kai" } } });

        renderHook(() => useLineCallback());

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
        const [, init] = callTo(fetchMock, "/api/line-auth/link")!;
        expect(init.headers!.Authorization).toBe("Bearer jwt-7");
        expect(JSON.parse(init.body!)).toMatchObject({ code: "code-1", nonce: "n1", codeVerifier: "v1" });
    });

    it("link without being signed in: shows an error and links back to the profile", async () => {
        setPending("link", "/profile");
        const fetchMock = mockFetch({});

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.error).toBe("กรุณาเข้าสู่ระบบก่อนเชื่อมต่อ LINE"));
        expect(result.current.backHref).toBe("/profile");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("user cancelled on LINE: shows a cancel message without calling the backend", async () => {
        setPending("login", "/");
        searchParams = new URLSearchParams({ error: "access_denied", state: "s1" });
        const fetchMock = mockFetch({});

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.error).toBe("ยกเลิกการเข้าสู่ระบบด้วย LINE"));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a callback whose state does not match (CSRF)", async () => {
        setPending("login", "/");
        searchParams = new URLSearchParams({ code: "code-1", state: "forged" });
        const fetchMock = mockFetch({});

        const { result } = renderHook(() => useLineCallback());

        await waitFor(() => expect(result.current.error).toMatch("ลิงก์ยืนยันตัวตนไม่ถูกต้อง"));
        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current.backHref).toBe("/login");
    });
});
