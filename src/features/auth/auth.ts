const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL ||
    process.env.STRAPI_BASE_URL ||
    "http://localhost:1337";

export interface LoginResponse {
    jwt: string;
    user: {
        id: number;
        documentId: string;
        picture: string;
        username: string;
        email: string;
    };
}

export interface RegisterResponse {
    jwt: string;
    user: {
        id: number;
        documentId: string;
        picture: string;
        username: string;
        email: string;
    };
}

export async function loginWithStrapi(
    identifier: string,
    password: string
): Promise<LoginResponse> {
    const res = await fetch(`${STRAPI_BASE_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Invalid email or password");
    }

    const data = await res.json();

    // Fetch populated user data, specifically for the picture field
    const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/me?populate=picture`, {
        headers: { Authorization: `Bearer ${data.jwt}` }
    });

    if (userRes.ok) {
        data.user = await userRes.json();
    }

    return data;
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

    const data = await res.json();

    // Fetch populated user data, specifically for the picture field
    const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/me?populate=picture`, {
        headers: { Authorization: `Bearer ${data.jwt}` }
    });

    if (userRes.ok) {
        data.user = await userRes.json();
    }

    return data;
}
