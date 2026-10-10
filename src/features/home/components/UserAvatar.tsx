import React from "react";
import Image from "next/image";

export const UserAvatar = ({ user, baseUrl }: { user: any, baseUrl: string }) => {
  if (user?.picture?.url) {
    const src = user.picture.url.startsWith("http") ? user.picture.url : `${baseUrl}${user.picture.url}`;
    return (
      <Image
        src={src}
        alt={user.username || "avatar"}
        width={12}
        height={12}
        className="w-3 h-3 rounded-full object-cover border border-white/10"
      />
    );
  }
  return (
    <div className="w-3 h-3 rounded-full bg-slate-700 flex items-center justify-center text-[6px] font-bold text-slate-300">
      {user?.username?.charAt(0).toUpperCase() || "?"}
    </div>
  );
};
