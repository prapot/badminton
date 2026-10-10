import React from "react";
import Image from "next/image";
import { RegisteredPlayer, BlockedPartnerPlayer } from "../../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

type DisplayPlayer = RegisteredPlayer | BlockedPartnerPlayer;

interface PlayerAvatarProps {
    player?: DisplayPlayer;
    size?: string;
}

const getAvatarUrl = (picture?: { url: string } | string | null) => {
    if (!picture) return null;
    const url = typeof picture === "string" ? picture : picture.url;
    if (!url) return null;
    return url.startsWith("http") ? url : `${STRAPI_BASE_URL}${url}`;
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, size = "w-10 h-10" }) => {
    const url = getAvatarUrl(player?.picture);
    const guestName = "guest_name" in (player || {}) ? (player as RegisteredPlayer).guest_name : undefined;
    const initial = (player?.nickname || player?.username || guestName || "?")[0]?.toUpperCase();

    if (url) {
        return (
            <div className={`relative ${size} rounded-full overflow-hidden shrink-0 border border-slate-600/80 bg-slate-800 shadow-sm`}>
                <Image
                    src={url}
                    alt={player?.username || "avatar"}
                    fill
                    className="object-cover"
                />
            </div>
        );
    }

    return (
        <div className={`relative ${size} rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 border border-white/20 shadow-inner`}>
            {initial}
        </div>
    );
};
