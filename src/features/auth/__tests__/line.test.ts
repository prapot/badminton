import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callTo, mockFetch, strapiError, stubLocation } from "./lineTestUtils";

vi.hoisted(() => {
    process.env.NEXT_PUBLIC_LINE_CHANNEL_ID = "2011995309";
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL = "http://strapi.test";
});

import {
    linkLineWithTicket,
    LineNotLinkedError,
    loginWithLine,
    isLinePlaceholderEmail,
    registerWithLine,
    startLineAuth,
    takePendingLineAuth,
} from "../line";

const PENDING_KEY = "line_auth_pending";

describe("startLineAuth", () => {
    beforeEach(() => sessionStorage.clear());
    afterEach(() => vi.unstubAllGlobals());

    it("redirects to LINE authorize with channel id, callback URL, state, nonce and PKCE", async () => {
        const location = stubLocation("https://127.0.0.1:3000");
        await startLineAuth("login", "/tournament/abc");

        const url = new URL(location.href);
        expect(url.origin + url.pathname).toBe("https://access.line.me/oauth2/v2.1/authorize");
        expect(url.searchParams.get("client_id")).toBe("2011995309");
        expect(url.searchParams.get("redirect_uri")).toBe("https://127.0.0.1:3000/auth/line/callback");
        expect(url.searchParams.get("scope")).toBe("profile openid");

        const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY)!);
        expect(pending).toMatchObject({ mode: "login", redirect: "/tournament/abc" });
        expect(url.searchParams.get("state")).toBe(pending.state);
        expect(url.searchParams.get("nonce")).toBe(pending.nonce);
        expect(pending.state).toMatch(/^[0-9a-f]{32}$/);
        expect(pending.nonce).not.toBe(pending.state);

        // PKCE: challenge sent to LINE = base64url(sha256(verifier kept in sessionStorage))
        expect(url.searchParams.get("code_challenge_method")).toBe("S256");
        expect(pending.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pending.codeVerifier));
        const expected = Buffer.from(digest).toString("base64url");
        expect(url.searchParams.get("code_challenge")).toBe(expected);
    });

    it("never stores an off-site redirect", async () => {
        stubLocation();
        await startLineAuth("login", "https://evil.example/phish");
        expect(JSON.parse(sessionStorage.getItem(PENDING_KEY)!).redirect).toBe("/");
    });

    it("throws when the channel id is not configured", async () => {
        vi.resetModules();
        const saved = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
        delete process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
        try {
            const fresh = await import("../line");
            stubLocation();
            await expect(fresh.startLineAuth("login", "/")).rejects.toThrow("NEXT_PUBLIC_LINE_CHANNEL_ID");
        } finally {
            process.env.NEXT_PUBLIC_LINE_CHANNEL_ID = saved;
        }
    });
});

describe("takePendingLineAuth", () => {
    const pending = { state: "s1", nonce: "n1", codeVerifier: "v1", mode: "link", redirect: "/profile" };
    beforeEach(() => sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending)));

    it("returns the pending auth when state matches, and can only be used once", () => {
        expect(takePendingLineAuth("s1")).toEqual(pending);
        expect(() => takePendingLineAuth("s1")).toThrow("ลิงก์ยืนยันตัวตนไม่ถูกต้อง");
    });

    it.each([
        ["a different state", "other"],
        ["no state", null],
    ])("rejects %s", (_, state) => {
        expect(() => takePendingLineAuth(state)).toThrow("ลิงก์ยืนยันตัวตนไม่ถูกต้อง");
    });

    it("sanitizes a tampered redirect in storage", () => {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...pending, redirect: "//evil.example" }));
        expect(takePendingLineAuth("s1").redirect).toBe("/");
    });

    it("rejects pending auth without a PKCE verifier (started before an upgrade)", () => {
        const { codeVerifier: _omit, ...legacy } = pending;
        void _omit;
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(legacy));
        expect(() => takePendingLineAuth("s1")).toThrow("ลิงก์ยืนยันตัวตนไม่ถูกต้อง");
    });

    it("rejects when nothing is pending or the stored value is corrupt", () => {
        sessionStorage.clear();
        expect(() => takePendingLineAuth("s1")).toThrow("ลิงก์ยืนยันตัวตนไม่ถูกต้อง");
        sessionStorage.setItem(PENDING_KEY, "{not json");
        expect(() => takePendingLineAuth("s1")).toThrow("ลิงก์ยืนยันตัวตนไม่ถูกต้อง");
    });
});

describe("Strapi LINE API calls", () => {
    beforeEach(() => stubLocation());
    afterEach(() => vi.unstubAllGlobals());

    it("loginWithLine sends code, nonce, PKCE verifier and redirect URI, then loads the user", async () => {
        const user = { id: 7, username: "kai" };
        const fetchMock = mockFetch({
            "/api/line-auth/login": { body: { jwt: "jwt-7" } },
            "/api/users/me": { body: user },
        });

        await expect(loginWithLine({ code: "code-1", nonce: "nonce-1", codeVerifier: "verifier-1" }))
            .resolves.toEqual({ jwt: "jwt-7", user });

        const [url, init] = callTo(fetchMock, "/api/line-auth/login")!;
        expect(url).toBe("http://strapi.test/api/line-auth/login");
        expect(JSON.parse(init.body!)).toEqual({
            code: "code-1",
            nonce: "nonce-1",
            codeVerifier: "verifier-1",
            redirectUri: "http://localhost:3000/auth/line/callback",
        });
        expect(callTo(fetchMock, "/api/users/me")![1].headers).toEqual({ Authorization: "Bearer jwt-7" });
    });

    it("turns LINE_NOT_LINKED into LineNotLinkedError carrying the link ticket", async () => {
        mockFetch({
            "/api/line-auth/login": strapiError(404, "ยังไม่ได้เชื่อมต่อ", {
                code: "LINE_NOT_LINKED",
                linkTicket: "ticket-1",
                displayName: "Kai",
            }),
        });

        const err = await loginWithLine({ code: "c", nonce: "n", codeVerifier: "v" }).catch((e) => e);
        expect(err).toBeInstanceOf(LineNotLinkedError);
        expect(err).toMatchObject({ linkTicket: "ticket-1", displayName: "Kai", message: "ยังไม่ได้เชื่อมต่อ" });
    });

    it("surfaces other Strapi errors as plain errors with the server message", async () => {
        mockFetch({ "/api/line-auth/login": strapiError(400, "ยืนยันตัวตนกับ LINE ไม่สำเร็จ") });
        const err = await loginWithLine({ code: "c", nonce: "n", codeVerifier: "v" }).catch((e) => e);
        expect(err).not.toBeInstanceOf(LineNotLinkedError);
        expect(err.message).toBe("ยืนยันตัวตนกับ LINE ไม่สำเร็จ");
    });

    it("registerWithLine creates the account from the ticket and loads the user", async () => {
        const fetchMock = mockFetch({
            "/api/line-auth/register": { body: { jwt: "jwt-8" } },
            "/api/users/me": { body: { id: 8, username: "Kai" } },
        });
        await expect(registerWithLine("ticket-1")).resolves.toEqual({ jwt: "jwt-8", user: { id: 8, username: "Kai" } });
        expect(JSON.parse(callTo(fetchMock, "/api/line-auth/register")![1].body!)).toEqual({ linkTicket: "ticket-1" });
    });

    it("linkLineWithTicket posts the ticket with the user's JWT", async () => {
        const fetchMock = mockFetch({ "/api/line-auth/link-ticket": { body: { linked: true, displayName: "Kai" } } });
        await expect(linkLineWithTicket("ticket-1", "jwt-7")).resolves.toEqual({ linked: true, displayName: "Kai" });

        const [, init] = callTo(fetchMock, "/api/line-auth/link-ticket")!;
        expect(init.method).toBe("POST");
        expect(init.headers!.Authorization).toBe("Bearer jwt-7");
        expect(JSON.parse(init.body!)).toEqual({ linkTicket: "ticket-1" });
    });
});

describe("isLinePlaceholderEmail", () => {
    it.each([
        ["u1234abcd@line.invalid", true],
        ["kai@example.com", false],
        ["kai@line.invalid.com", false],
        [null, false],
        [undefined, false],
    ])("%s → %s", (email, expected) => {
        expect(isLinePlaceholderEmail(email)).toBe(expected);
    });
});
