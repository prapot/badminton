import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { ProfileFormState } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function useProfileForm(user: any, jwt: string | null, initialPictureUrl: string | null) {
    const [form, setForm] = useState<ProfileFormState>({
        documentId: "",
        picture: "",
        username: "",
        nickname: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewObjUrl, setPreviewObjUrl] = useState<string | null>(null);

    // Sync user data to form
    useEffect(() => {
        if (user) {
            setForm((f) => ({
                ...f,
                username: user.username,
                nickname: user.nickname || "",
                email: user.email
            }));
        }
    }, [user]);

    // Sync picture
    useEffect(() => {
        if (initialPictureUrl && !file) {
            setPreviewObjUrl(initialPictureUrl);
        }
    }, [initialPictureUrl, file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            setPreviewObjUrl(URL.createObjectURL(f));
        }
    };

    const handleSave = async () => {
        if (!jwt) return;

        if (form.password && form.password !== form.confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            return;
        }
        if (form.password && form.password.length < 6) {
            setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // Upload picture if a new file is selected
            if (file) {
                const formData = new FormData();
                formData.append("files", file);
                const uploadRes = await fetch(`${STRAPI_BASE_URL}/api/profile/upload-picture`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${jwt}` },
                    body: formData,
                });
                if (!uploadRes.ok) throw new Error("อัปโหลดรูปภาพไม่สำเร็จ");
            }

            const payload: Record<string, any> = {
                username: form.username.trim(),
                nickname: form.nickname.trim(),
                email: form.email.trim(),
            };
            if (form.password) payload.password = form.password;

            const res = await fetch(`${STRAPI_BASE_URL}/api/profile/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ data: payload }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }

            // Fetch populated user to get the new picture url
            const pRes = await fetch(`${STRAPI_BASE_URL}/api/users/me?populate=picture`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            const updated = await pRes.json();

            // Update localStorage so Navbar reflects new info
            const stored = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({
                ...stored,
                username: updated.username ?? form.username,
                nickname: updated.nickname ?? form.nickname,
                email: updated.email ?? form.email,
                picture: updated.picture ?? stored.picture,
            }));

            Swal.fire({
                title: "สำเร็จ!",
                text: "บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว",
                icon: "success",
                confirmButtonColor: "#2ecc71",
                background: "#1a2535",
                color: "#fff"
            });
            
            setFile(null);
            setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
            window.dispatchEvent(new Event("storage"));
            setSuccess(true);

        } catch (e: unknown) {
            Swal.fire({
                title: "เกิดข้อผิดพลาด",
                text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ",
                icon: "error",
                confirmButtonColor: "#e74c3c",
                background: "#1a2535",
                color: "#fff"
            });
            setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return {
        form,
        setForm,
        saving,
        success,
        error,
        previewObjUrl,
        handleFileChange,
        handleSave
    };
}
