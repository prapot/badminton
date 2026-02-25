const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL ||
    process.env.STRAPI_BASE_URL ||
    "http://localhost:1337";

export interface LoginResponse {
    jwt: string;
    user: {
        id: number;
        username: string;
        email: string;
    };
}

export interface RegisterResponse {
    jwt: string;
    user: {
        id: number;
        username: string;
        email: string;
    };
}

export async function loginWithStrapi(
    email: string,
    password: string
): Promise<LoginResponse> {
    const res = await fetch(`${STRAPI_BASE_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Invalid email or password");
    }

    return res.json();
}

export async function registerWithStrapi(
    username: string,
    email: string,
    password: string
): Promise<RegisterResponse> {
    const res = await fetch(`${STRAPI_BASE_URL}/api/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Registration failed");
    }

    return res.json();
}
