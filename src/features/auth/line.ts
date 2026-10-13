import { fetchCurrentUser, LoginResponse } from "@/features/auth/auth";
import { safeRedirectPath } from "@/features/auth/safeRedirect";

const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL ||
    process.env.STRAPI_BASE_URL ||
    "http://localhost:1337";

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || "";
const PENDING_KEY = "line_auth_pending";

export type LineAuthMode = "login" | "link";

interface PendingLineAuth {
    state: string;
    nonce: string;
    /** PKCE — ส่งให้ backend ตอนแลก code */
    codeVerifier: string;
    mode: LineAuthMode;
    redirect: string;
}

/** ของที่ backend ต้องใช้แลก code จาก LINE */
export type LineCodeGrant = Pick<PendingLineAuth, "nonce" | "codeVerifier"> & { code: string };

export interface LineLinkStatus {
    linked: boolean;
    displayName: string | null;
}

/** LINE ยืนยันตัวตนแล้วแต่ยังไม่ผูกกับบัญชีไหน — ใช้ linkTicket ผูกหลัง login/สมัครด้วยอีเมล */
export class LineNotLinkedError extends Error {
    constructor(message: string, readonly linkTicket: string, readonly displayName: string) {
        super(message);
    }
}

function randomToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function base64url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** PKCE (RFC 7636, S256): verifier 43 ตัวอักษร, challenge = base64url(sha256(verifier)) */
export async function createPkcePair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
    return { codeVerifier, codeChallenge: base64url(new Uint8Array(digest)) };
}

// ต้องตรงกับ Callback URL ที่ลงทะเบียนไว้ใน LINE Developers Console
function getRedirectUri(): string {
    return `${window.location.origin}/auth/line/callback`;
}

/** ไปหน้า LINE เพื่อ login หรือเชื่อมต่อบัญชี แล้ว LINE จะส่งกลับมาที่ /auth/line/callback */
export async function startLineAuth(mode: LineAuthMode, redirect: string) {
    if (!LINE_CHANNEL_ID) {
        throw new Error("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LINE_CHANNEL_ID");
    }
    const { codeVerifier, codeChallenge } = await createPkcePair();
    const pending: PendingLineAuth = {
        state: randomToken(),
        nonce: randomToken(),
        codeVerifier,
        mode,
        redirect: safeRedirectPath(redirect),
    };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    const params = new URLSearchParams({
        response_type: "code",
        client_id: LINE_CHANNEL_ID,
        redirect_uri: getRedirectUri(),
        state: pending.state,
        nonce: pending.nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        scope: "profile openid",
    });
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
}

/** อ่าน + ลบ pending state (ใช้ได้ครั้งเดียว) และตรวจว่า state ตรงกับที่ LINE ส่งกลับมา */
export function takePendingLineAuth(returnedState: string | null): PendingLineAuth {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    let pending: PendingLineAuth | null = null;
    try {
        pending = raw ? JSON.parse(raw) : null;
    } catch {
        // ข้อมูลเสีย — ถือว่าไม่มี
    }
    if (!pending || !returnedState || pending.state !== returnedState || !pending.codeVerifier) {
        throw new Error("ลิงก์ยืนยันตัวตนไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง");
    }
    return { ...pending, redirect: safeRedirectPath(pending.redirect) };
}

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
        const message = data?.error?.message || "เกิดข้อผิดพลาด";
        const details = data?.error?.details;
        if (details?.code === "LINE_NOT_LINKED") {
            throw new LineNotLinkedError(message, details.linkTicket, details.displayName || "");
        }
        throw new Error(message);
    }
    return data as T;
}

function codeBody({ code, nonce, codeVerifier }: LineCodeGrant) {
    return JSON.stringify({ code, nonce, codeVerifier, redirectUri: getRedirectUri() });
}

export async function loginWithLine(grant: LineCodeGrant): Promise<LoginResponse> {
    const { jwt } = await lineAuthRequest<{ jwt: string }>("/login", { method: "POST", body: codeBody(grant) });
    const user = await fetchCurrentUser(jwt);
    if (!user) throw new Error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
    return { jwt, user };
}

export function linkLine(grant: LineCodeGrant, jwt: string) {
    return lineAuthRequest<LineLinkStatus>("/link", { method: "POST", body: codeBody(grant) }, jwt);
}

/** บัญชีที่สมัครด้วย LINE ได้อีเมลชั่วคราว (backend: PLACEHOLDER_EMAIL_DOMAIN) จนกว่าจะตั้งเองในโปรไฟล์ */
export function isLinePlaceholderEmail(email?: string | null): boolean {
    return !!email?.endsWith("@line.invalid");
}

/** สมัครบัญชีใหม่จาก LINE: ชื่อ LINE เป็น username, อีเมลชั่วคราว, รหัสผ่านสุ่ม */
export async function registerWithLine(linkTicket: string): Promise<LoginResponse> {
    const { jwt } = await lineAuthRequest<{ jwt: string }>("/register", { method: "POST", body: JSON.stringify({ linkTicket }) });
    const user = await fetchCurrentUser(jwt);
    if (!user) throw new Error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
    return { jwt, user };
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
