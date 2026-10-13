import Pusher from "pusher-js";

// One shared connection per tab — hooks subscribe/unsubscribe channels but never disconnect it.
let client: Pusher | null | undefined;

export function getPusher(): Pusher | null {
    if (typeof window === "undefined") return null;
    if (client !== undefined) return client;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) {
        console.warn("[realtime] NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER not set — falling back to polling");
        client = null;
        return client;
    }

    client = new Pusher(key, { cluster });
    return client;
}
