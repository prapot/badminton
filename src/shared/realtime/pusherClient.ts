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

// Several hooks can listen on the same channel (e.g. `user-<id>` for match alerts and rank results).
// Ref-count subscriptions so one hook's cleanup does not unsubscribe the channel from the others.
const refCounts = new Map<string, number>();

/** Subscribe to a channel; call the returned function to release it. */
export function acquireChannel(name: string) {
    const pusher = getPusher();
    if (!pusher) return null;
    refCounts.set(name, (refCounts.get(name) || 0) + 1);
    const channel = pusher.subscribe(name);
    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        const left = (refCounts.get(name) || 1) - 1;
        if (left > 0) {
            refCounts.set(name, left);
        } else {
            refCounts.delete(name);
            pusher.unsubscribe(name);
        }
    };
    return { channel, release };
}
