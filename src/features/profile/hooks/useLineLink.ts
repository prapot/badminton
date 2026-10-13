import { useCallback, useEffect, useState } from "react";
import { getLineLinkStatus, LineLinkStatus, startLineAuth, unlinkLine } from "@/features/auth/line";

export function useLineLink(jwt: string | null) {
    const [status, setStatus] = useState<LineLinkStatus | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!jwt) return;
        getLineLinkStatus(jwt)
            .then(setStatus)
            .catch((err: Error) => setError(err.message));
    }, [jwt]);

    const link = useCallback(async () => {
        try {
            await startLineAuth("link", "/profile");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        }
    }, []);

    const unlink = useCallback(async () => {
        if (!jwt) return;
        setBusy(true);
        setError(null);
        try {
            setStatus(await unlinkLine(jwt));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setBusy(false);
        }
    }, [jwt]);

    return { status, busy, error, link, unlink };
}
