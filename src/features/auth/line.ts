import { fetchCurrentUser, LoginResponse } from "@/features/auth/auth";

const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL ||
    process.env.STRAPI_BASE_URL ||
    "http://localhost:1337";

const HANDOFF_KEY = "line_auth_handoff";
const HANDOFF_TTL_MS = 10 * 60 * 1000;

export type LineAuthMode = "login" | "link";

export interface LineLinkStatus {
    linked: boolean;
    displayName: string | null;
}

/** ผลจาก backend เมื่อ LINE ส่งกลับมาที่ /auth/line/callback */
export type LineCallbackResult =
    | { result: "login"; jwt: string; redirect: string }
    | { result: "linked"; displayName: string; redirect: string }
    | { result: "not_linked"; linkTicket: string; displayName: string; redirect: string; handoffId: string };

export type HandoffClaim = { status: "pending" } | { status: "done"; session: LoginResponse };

async function lineAuthRequest<T>(path: string, init: RequestInit, jwt?: string | null): Promise<T> {
    const res = await fetch(`${STRAPI_BASE_URL}/api/line-auth${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error?.message || "เกิดข้อผิดพลาด");
    }
    return data as T;
}

export async function sessionFromJwt(jwt: string): Promise<LoginResponse> {
    const user = await fetchCurrentUser(jwt);
    if (!user) throw new Error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
    return { jwt, user };
}

// ต้องตรงกับ Callback URL ที่ลงทะเบียนไว้ใน LINE Developers Console
function getRedirectUri(): string {
    return `${window.location.origin}/auth/line/callback`;
}

/**
 * ไปหน้า LINE เพื่อ login หรือเชื่อมต่อบัญชี — state/nonce/PKCE เก็บที่ backend ไม่ใช่ในเบราว์เซอร์
 * เพราะบนมือถือแอป LINE เปิด callback เองในเบราว์เซอร์อื่น (iOS: เบราว์เซอร์ในแอป LINE) ที่ไม่เห็น storage ของแท็บนี้
 */
export async function startLineAuth(mode: LineAuthMode, redirect: string, jwt?: string | null) {
    const { authorizeUrl, handoffId } = await lineAuthRequest<{ authorizeUrl: string; handoffId: string | null }>(
        "/start",
        { method: "POST", body: JSON.stringify({ mode, redirect, redirectUri: getRedirectUri() }) },
        jwt
    );
    // login: ถ้า login ไปเสร็จในเบราว์เซอร์อื่น แท็บนี้มารับ session ทีหลังได้ (claimLineHandoff)
    if (handoffId) {
        localStorage.setItem(HANDOFF_KEY, JSON.stringify({ id: handoffId, createdAt: Date.now() }));
    }
    window.location.href = authorizeUrl;
}

export function completeLineCallback(code: string, state: string) {
    return lineAuthRequest<LineCallbackResult>("/callback", { method: "POST", body: JSON.stringify({ code, state }) });
}

function readHandoffId(): string | null {
    try {
        const { id, createdAt } = JSON.parse(localStorage.getItem(HANDOFF_KEY) || "null") ?? {};
        if (typeof id === "string" && Date.now() - createdAt <= HANDOFF_TTL_MS) return id;
    } catch {
        // ข้อมูลเสีย — ถือว่าไม่มี
    }
    clearLineHandoff();
    return null;
}

export function clearLineHandoff() {
    localStorage.removeItem(HANDOFF_KEY);
}

export function hasLineHandoff(): boolean {
    return readHandoffId() !== null;
}

/**
 * แท็บที่เริ่ม login ด้วย LINE ถามว่า login เสร็จที่อื่นแล้วหรือยัง — ได้ session ครั้งเดียว
 * คืน null เมื่อไม่มีอะไรรอ (ไม่เคยเริ่ม, หมดอายุ, หรือรับไปแล้ว)
 */
export async function claimLineHandoff(): Promise<HandoffClaim | null> {
    const id = readHandoffId();
    if (!id) return null;
    let claim: { status: "pending" } | { status: "done"; jwt: string };
    try {
        claim = await lineAuthRequest(`/handoff/${encodeURIComponent(id)}`, { method: "GET" });
    } catch {
        clearLineHandoff();
        return null;
    }
    if (claim.status === "pending") return claim;
    clearLineHandoff();
    return { status: "done", session: await sessionFromJwt(claim.jwt) };
}

/** หลังเลือกบัญชี/สมัครในหน้า callback: ส่ง session ไปให้แท็บที่เริ่ม login ด้วย */
export function publishLineHandoff(handoffId: string, jwt: string) {
    return lineAuthRequest<{ ok: true }>("/handoff", { method: "POST", body: JSON.stringify({ handoffId }) }, jwt);
}

/** บัญชีที่สมัครด้วย LINE ได้อีเมลชั่วคราว (backend: PLACEHOLDER_EMAIL_DOMAIN) จนกว่าจะตั้งเองในโปรไฟล์ */
export function isLinePlaceholderEmail(email?: string | null): boolean {
    return !!email?.endsWith("@line.invalid");
}

/** สมัครบัญชีใหม่จาก LINE: ชื่อ LINE เป็น username, อีเมลชั่วคราว, รหัสผ่านสุ่ม */
export async function registerWithLine(linkTicket: string): Promise<LoginResponse> {
    const { jwt } = await lineAuthRequest<{ jwt: string }>("/register", { method: "POST", body: JSON.stringify({ linkTicket }) });
    return sessionFromJwt(jwt);
}

export function linkLineWithTicket(linkTicket: string, jwt: string) {
    return lineAuthRequest<LineLinkStatus>("/link-ticket", { method: "POST", body: JSON.stringify({ linkTicket }) }, jwt);
}

export function unlinkLine(jwt: string) {
    return lineAuthRequest<LineLinkStatus>("/link", { method: "DELETE" }, jwt);
}

export function getLineLinkStatus(jwt: string) {
    return lineAuthRequest<LineLinkStatus>("/status", { method: "GET" }, jwt);
}
