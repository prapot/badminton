import React from 'react';
import { QRCodeCanvas } from "qrcode.react";
import Swal from "sweetalert2";

interface QRInviteModalProps {
    showQR: boolean;
    setShowQR: (val: boolean) => void;
    shareUrl: string;
}

const QRInviteModal: React.FC<QRInviteModalProps> = ({
    showQR,
    setShowQR,
    shareUrl,
}) => {
    if (!showQR) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowQR(false)} />
            <div className="relative w-full max-w-sm bg-[#1a2535] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8 animate-in animate-out fade-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl mb-4">🔗</div>
                    <h3 className="text-xl font-bold text-white mb-2">เชิญเพื่อนเข้าแข่งขัน</h3>
                    <p className="text-sm text-slate-400 mb-6">แสกน QR Code ด้านล่างเพื่อเข้าร่วมรายการนี้</p>

                    <div className="p-4 bg-white rounded-2xl shadow-inner mb-6">
                        <QRCodeCanvas
                            value={shareUrl}
                            size={200}
                            level="H"
                            includeMargin={false}
                        />
                    </div>

                    <div className="w-full space-y-3">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(shareUrl);
                                Swal.fire({
                                    title: "คัดลอกลิงก์แล้ว!",
                                    text: "คุณสามารถส่งลิงก์ให้เพื่อนได้ทันที",
                                    icon: "success",
                                    timer: 1500,
                                    showConfirmButton: false,
                                    background: "#1a2535",
                                    color: "#fff"
                                });
                            }}
                            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all"
                        >
                            คัดลอกลิงก์
                        </button>
                        <button
                            onClick={() => setShowQR(false)}
                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold transition-all"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRInviteModal;
