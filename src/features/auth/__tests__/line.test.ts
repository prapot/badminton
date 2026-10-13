import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callTo, mockFetch, strapiError, stubLocation } from "./lineTestUtils";

vi.hoisted(() => {
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL = "http://strapi.test";
});

import {
    claimLineHandoff,
    completeLineCallback,
    hasLineHandoff,
    isLinePlaceholderEmail,
    linkLineWithTicket,
    publishLineHandoff,
    registerWithLine,
    startLineAuth,
} from "../line";

const HANDOFF_KEY = "line_auth_handoff";
const AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize?state=s1";

describe("startLineAuth", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.unstubAllGlobals());

    it("login: asks the backend to start, remembers the handoff id, and goes to LINE", async () => {
        const location = stubLocation("https://127.0.0.1:3000");
        const fetchMock = mockFetch({ "/api/line-auth/start": { body: { authorizeUrl: AUTHORIZE_URL, handoffId: "h1" } } });

        await startLineAuth("login", "/tournament/abc");

        const [url, init] = callTo(fetchMock, "/api/line-auth/start")!;
        expect(url).toBe("http://strapi.test/api/line-auth/start");
        expect(JSON.parse(init.body!)).toEqual({
            mode: "login",
            redirect: "/tournament/abc",
            redirectUri: "https://127.0.0.1:3000/auth/line/callback",
        });
        expect(init.headers!.Authorization).toBeUndefined();
        expect(JSON.parse(localStorage.getItem(HANDOFF_KEY)!)).toMatchObject({ id: "h1" });
        expect(location.href).toBe(AUTHORIZE_URL);
    });

    it("link: sends the user's JWT and keeps no handoff", async () => {
        const location = stubLocation();
        const fetchMock = mockFetch({ "/api/line-auth/start": { body: { authorizeUrl: AUTHORIZE_URL, handoffId: null } } });

        await startLineAuth("link", "/profile", "jwt-7");

        expect(callTo(fetchMock, "/api/line-auth/start")![1].headers!.Authorization).toBe("Bearer jwt-7");
        expect(localStorage.getItem(HANDOFF_KEY)).toBeNull();
        expect(location.href).toBe(AUTHORIZE_URL);
    });

    it("stays on the page and throws when the backend refuses", async () => {
        const location = stubLocation();
        mockFetch({ "/api/line-auth/start": strapiError(401, "กรุณาเข้าสู่ระบบก่อน") });
        await expect(startLineAuth("link", "/profile", "expired")).rejects.toThrow("กรุณาเข้าสู่ระบบก่อน");
        expect(location.href).toBe("http://localhost:3000/login");
    });
});

describe("claimLineHandoff", () => {
    const setHandoff = (createdAt = Date.now()) =>
        localStorage.setItem(HANDOFF_KEY, JSON.stringify({ id: "h1", createdAt }));

    beforeEach(() => localStorage.clear());
    afterEach(() => vi.unstubAllGlobals());

    it("does nothing when no LINE sign-in was started here", async () => {
        const fetchMock = mockFetch({});
        await expect(claimLineHandoff()).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reports pending and keeps waiting while the sign-in is not finished", async () => {
        setHandoff();
        mockFetch({ "/api/line-auth/handoff/h1": { body: { status: "pending" } } });
        await expect(claimLineHandoff()).resolves.toEqual({ status: "pending" });
        expect(hasLineHandoff()).toBe(true);
    });

    it("hands over the session once it finished in another browser", async () => {
        setHandoff();
        const user = { id: 7, username: "kai" };
        mockFetch({
            "/api/line-auth/handoff/h1": { body: { status: "done", jwt: "jwt-7" } },
            "/api/users/me": { body: user },
        });
        await expect(claimLineHandoff()).resolves.toEqual({ status: "done", session: { jwt: "jwt-7", user } });
        expect(hasLineHandoff()).toBe(false);
    });

    it("forgets the handoff when the backend no longer knows it", async () => {
        setHandoff();
        mockFetch({ "/api/line-auth/handoff/h1": strapiError(404, "หมดอายุ") });
        await expect(claimLineHandoff()).resolves.toBeNull();
        expect(hasLineHandoff()).toBe(false);
    });

    it("ignores a handoff older than 10 minutes without asking the backend", async () => {
        setHandoff(Date.now() - 11 * 60 * 1000);
        const fetchMock = mockFetch({});
        await expect(claimLineHandoff()).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(hasLineHandoff()).toBe(false);
    });
});

describe("Strapi LINE API calls", () => {
    beforeEach(() => stubLocation());
    afterEach(() => vi.unstubAllGlobals());

    it("completeLineCallback sends only code and state", async () => {
        const fetchMock = mockFetch({ "/api/line-auth/callback": { body: { result: "login", jwt: "jwt-7", redirect: "/" } } });
        await expect(completeLineCallback("code-1", "s1")).resolves.toMatchObject({ result: "login", jwt: "jwt-7" });
        expect(JSON.parse(callTo(fetchMock, "/api/line-auth/callback")![1].body!)).toEqual({ code: "code-1", state: "s1" });
    });

    it("surfaces Strapi errors with the server message", async () => {
        mockFetch({ "/api/line-auth/callback": strapiError(400, "การเข้าสู่ระบบด้วย LINE หมดอายุแล้ว") });
        await expect(completeLineCallback("c", "s")).rejects.toThrow("การเข้าสู่ระบบด้วย LINE หมดอายุแล้ว");
    });

    it("publishLineHandoff posts the handoff id with the new session's JWT", async () => {
        const fetchMock = mockFetch({ "/api/line-auth/handoff": { body: { ok: true } } });
        await publishLineHandoff("h1", "jwt-8");
        const [, init] = callTo(fetchMock, "/api/line-auth/handoff")!;
        expect(init.headers!.Authorization).toBe("Bearer jwt-8");
        expect(JSON.parse(init.body!)).toEqual({ handoffId: "h1" });
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
