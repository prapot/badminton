import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { FormData } from "../constants";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function useCreateTournament() {
    const router = useRouter();
    const { user, jwt } = useAuth();

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>({
        name: "",
        type: "single",
        format: "round_robin",
        startDate: new Date().toISOString().split('T')[0],
        mode: "ranking",
    });

    const canNext1 = form.name.trim().length > 0;

    const handleSubmit = async () => {
        if (!jwt || !user) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    data: {
                        name: form.name.trim(),
                        type: form.type,
                        format: form.format,
                        startDate: form.startDate,
                        mode: form.mode,
                        tournament_status: "upcoming",
                        user_created: user.id,
                    },
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            const newId = json?.data?.documentId;
            router.push(newId ? `/tournament/${newId}` : "/tournament");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "สร้างไม่สำเร็จ");
            setSubmitting(false);
        }
    };

    return {
        user,
        step,
        setStep,
        submitting,
        error,
        form,
        setForm,
        canNext1,
        handleSubmit
    };
}
