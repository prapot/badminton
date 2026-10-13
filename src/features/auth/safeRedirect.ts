/**
 * Only allow redirects to a path on this site — `?redirect=` comes from the URL, so without
 * this a crafted link could send the user to another site right after they sign in.
 * Rejects absolute URLs, protocol-relative `//host`, backslashes (`/\host`) and control
 * characters (browsers strip tabs/newlines, turning `/\t/host` into `//host`).
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
    if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
    return value;
}
