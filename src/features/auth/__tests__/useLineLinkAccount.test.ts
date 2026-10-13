import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Swal from "sweetalert2";
import { callTo, mockFetch, strapiError } from "./lineTestUtils";

vi.hoisted(() => {
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL = "http://strapi.test";
});

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn(async () => ({ isConfirmed: true })) } }));

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { useLineLinkAccount } from "../useLineLinkAccount";

const pendingLink = { linkTicket: "ticket-1", displayName: "Kai", redirect: "/tournament/abc", handoffId: "h1" };
const user = { id: 7, username: "kai" };

describe("useLineLinkAccount", () => {
    beforeEach(() => {
        replace.mockReset();
        vi.mocked(Swal.fire).mockClear();
        localStorage.clear();
    });
    afterEach(() => vi.unstubAllGlobals());

    it("existing account: signs in, links the ticket with the new JWT, then redirects", async () => {
        const fetchMock = mockFetch({
            "/api/auth/local": { body: { jwt: "jwt-7", user } },
            "/api/users/me": { body: user },
            "/api/line-auth/link-ticket": { body: { linked: true, displayName: "Kai" } },
            "/api/line-auth/handoff": { body: { ok: true } },
        });
        const { result } = renderHook(() => useLineLinkAccount(pendingLink));

        await act(() => result.current.loginAndLink("kai@example.com", "secret1"));

        // the tab that started the LINE sign-in (maybe another browser) gets this session too
        const [, handoffInit] = callTo(fetchMock, "/api/line-auth/handoff")!;
        expect(handoffInit.headers!.Authorization).toBe("Bearer jwt-7");
        expect(JSON.parse(handoffInit.body!)).toEqual({ handoffId: "h1" });

        const [, linkInit] = callTo(fetchMock, "/api/line-auth/link-ticket")!;
        expect(linkInit.headers!.Authorization).toBe("Bearer jwt-7");
        expect(JSON.parse(linkInit.body!)).toEqual({ linkTicket: "ticket-1" });
        expect(localStorage.getItem("jwt")).toBe("jwt-7");
        expect(replace).toHaveBeenCalledWith("/tournament/abc");
        expect(Swal.fire).not.toHaveBeenCalled();
    });

    it("wrong password: shows the error, stays on the form, links nothing", async () => {
        const fetchMock = mockFetch({
            "/api/auth/local": strapiError(400, "Invalid identifier or password"),
        });
        const { result } = renderHook(() => useLineLinkAccount(pendingLink));

        await act(() => result.current.loginAndLink("kai@example.com", "wrong"));

        expect(result.current.error).toBe("Invalid identifier or password");
        expect(result.current.submitting).toBe(false);
        expect(callTo(fetchMock, "/api/line-auth/link-ticket")).toBeUndefined();
        expect(localStorage.getItem("jwt")).toBeNull();
        expect(replace).not.toHaveBeenCalled();
    });

    it("new player: creates the account from LINE in one step and redirects", async () => {
        const fetchMock = mockFetch({
            "/api/line-auth/register": { body: { jwt: "jwt-8" } },
            "/api/users/me": { body: { id: 8, username: "Kai" } },
            "/api/line-auth/handoff": { body: { ok: true } },
        });
        const { result } = renderHook(() => useLineLinkAccount(pendingLink));

        await act(() => result.current.register());

        expect(callTo(fetchMock, "/api/line-auth/handoff")![1].headers!.Authorization).toBe("Bearer jwt-8");

        expect(JSON.parse(callTo(fetchMock, "/api/line-auth/register")![1].body!)).toEqual({ linkTicket: "ticket-1" });
        expect(callTo(fetchMock, "/api/line-auth/link-ticket")).toBeUndefined();
        expect(localStorage.getItem("jwt")).toBe("jwt-8");
        expect(replace).toHaveBeenCalledWith("/tournament/abc");
    });

    it("new player whose LINE email already has an account: shows the server message and stays", async () => {
        mockFetch({
            "/api/line-auth/register": strapiError(400, "อีเมล kai@example.com มีบัญชีอยู่แล้ว"),
        });
        const { result } = renderHook(() => useLineLinkAccount(pendingLink));

        await act(() => result.current.register());

        expect(result.current.error).toBe("อีเมล kai@example.com มีบัญชีอยู่แล้ว");
        expect(result.current.submitting).toBe(false);
        expect(localStorage.getItem("jwt")).toBeNull();
        expect(replace).not.toHaveBeenCalled();
    });

    it("signed in but the ticket expired: keeps the user signed in and explains, instead of getting stuck", async () => {
        mockFetch({
            "/api/auth/local": { body: { jwt: "jwt-7", user } },
            "/api/users/me": { body: user },
            "/api/line-auth/link-ticket": strapiError(400, "การยืนยันตัวตนกับ LINE หมดอายุแล้ว"),
            // handoff failing must not block the user either
            "/api/line-auth/handoff": strapiError(400, "หมดอายุ"),
        });
        const { result } = renderHook(() => useLineLinkAccount(pendingLink));

        await act(() => result.current.loginAndLink("kai@example.com", "secret1"));

        expect(localStorage.getItem("jwt")).toBe("jwt-7");
        expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
            title: "เข้าสู่ระบบแล้ว แต่เชื่อมต่อ LINE ไม่สำเร็จ",
            text: expect.stringContaining("หมดอายุ"),
        }));
        expect(replace).toHaveBeenCalledWith("/tournament/abc");
    });
});
