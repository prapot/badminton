import { vi } from "vitest";

type Route = { status?: number; body: unknown };
type MockInit = { method?: string; body?: string; headers?: Record<string, string> };

/** fetch mock ที่ตอบตาม path (ตัวแรกที่ URL ลงท้ายด้วย key) และเก็บ call ไว้ตรวจ */
export function mockFetch(routes: Record<string, Route>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchMock = vi.fn(async (url: string, _init?: MockInit) => {
        const path = new URL(url).pathname;
        const match = Object.keys(routes).find((key) => path.endsWith(key));
        if (!match) throw new Error(`unexpected fetch: ${url}`);
        const { status = 200, body } = routes[match];
        return { ok: status < 400, status, json: async () => body } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

export function callTo(fetchMock: ReturnType<typeof mockFetch>, pathSuffix: string): [string, MockInit] | undefined {
    const call = fetchMock.mock.calls.find(([url]) => new URL(url).pathname.endsWith(pathSuffix));
    return call && [call[0], call[1] ?? {}];
}

export function strapiError(status: number, message: string, details: Record<string, unknown> = {}) {
    return { status, body: { data: null, error: { status, message, details } } };
}

/** แทน window.location เพื่อจับ redirect ไป LINE (jsdom นำทางจริงไม่ได้) */
export function stubLocation(origin = "http://localhost:3000") {
    const location = { origin, href: `${origin}/login` };
    vi.stubGlobal("location", location);
    return location;
}
