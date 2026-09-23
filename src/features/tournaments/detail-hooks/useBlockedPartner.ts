import { useState, useCallback, useEffect } from "react";
import Swal from "sweetalert2";
import { BlockedPartnerData } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface UseBlockedPartnerProps {
    tournamentId: string;
    jwt: string | null;
    isJoined: boolean;
    onBlockChange?: () => void;
}

export function useBlockedPartner({ tournamentId, jwt, isJoined, onBlockChange }: UseBlockedPartnerProps) {
    const [blockedPartner, setBlockedPartner] = useState<BlockedPartnerData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    const fetchBlockedPartner = useCallback(async () => {
        if (!jwt || !tournamentId || !isJoined) {
            setBlockedPartner(null);
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}/my-blocked-partner`, {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
            });

            if (res.ok) {
                const json = await res.json();
                setBlockedPartner(json.data || null);
            }
        } catch (error) {
            console.error("Failed to fetch blocked partner:", error);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, jwt, isJoined]);

    useEffect(() => {
        fetchBlockedPartner();
    }, [fetchBlockedPartner]);

    const saveBlockedPartner = async (targetPlayerId: number): Promise<boolean> => {
        if (!jwt || !tournamentId) return false;

        setSaving(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}/blocked-partner`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    data: { targetPlayerId },
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                const errorMsg = json?.error?.message || json?.message || "ไม่สามารถตั้งค่าได้";
                await Swal.fire({
                    icon: "warning",
                    title: "ไม่สามารถตั้งค่าได้",
                    text: errorMsg,
                    confirmButtonText: "รับทราบ",
                    confirmButtonColor: "#f59e0b",
                    background: "#1e293b",
                    color: "#f8fafc",
                });
                return false;
            }

            await fetchBlockedPartner();
            onBlockChange?.();
            await Swal.fire({
                icon: "success",
                title: "บันทึกเรียบร้อย",
                text: "ระบบจะจัดให้คุณและผู้เล่นท่านนี้อยู่คนละทีมเสมอ (ข้อมูลนี้เฉพาะคุณเท่านั้นที่เห็น)",
                timer: 2000,
                showConfirmButton: false,
                background: "#1e293b",
                color: "#f8fafc",
            });
            return true;
        } catch (error: any) {
            await Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: error?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
                confirmButtonText: "ตกลง",
                confirmButtonColor: "#ef4444",
                background: "#1e293b",
                color: "#f8fafc",
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const removeBlockedPartner = async (): Promise<boolean> => {
        if (!jwt || !tournamentId) return false;

        const confirm = await Swal.fire({
            title: "ยกเลิกเป้าหมายท้าดวล?",
            text: "ระบบจะสามารถจัดทีมได้ตามปกติ",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "ยืนยันยกเลิก",
            cancelButtonText: "กลับ",
            confirmButtonColor: "#3b82f6",
            cancelButtonColor: "#64748b",
            background: "#1e293b",
            color: "#f8fafc",
        });

        if (!confirm.isConfirmed) return false;

        setSaving(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}/blocked-partner`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json?.error?.message || "ไม่สามารถยกเลิกได้");
            }

            setBlockedPartner(null);
            onBlockChange?.();
            await Swal.fire({
                icon: "success",
                title: "ยกเลิกเรียบร้อยแล้ว",
                timer: 1500,
                showConfirmButton: false,
                background: "#1e293b",
                color: "#f8fafc",
            });
            return true;
        } catch (error: any) {
            await Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: error?.message || "เกิดข้อผิดพลาดในการยกเลิกการตั้งค่า",
                confirmButtonText: "ตกลง",
                confirmButtonColor: "#ef4444",
                background: "#1e293b",
                color: "#f8fafc",
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        blockedPartner,
        loading,
        saving,
        fetchBlockedPartner,
        saveBlockedPartner,
        removeBlockedPartner,
    };
}
