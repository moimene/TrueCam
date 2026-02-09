import React from 'react';
import { Zap, FileClock } from 'lucide-react';

interface CameraHUDProps {
    onCapture: () => void;
    lastImage: string | null;
}

const CameraHUD: React.FC<CameraHUDProps> = ({ onCapture, lastImage }) => {
    return (
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pointer-events-none">

            {/* Top Bar */}
            <div className="flex justify-between items-start pt-8 pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <FileClock className="w-4 h-4 text-ead-blue" />
                    <span className="text-white text-xs font-mono">QTSP READY</span>
                </div>

                <button aria-label="Flash Toggle" className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white">
                    <Zap className="w-5 h-5" />
                </button>
            </div>

            {/* Timestamp Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-50">
                {/* Focusing reticle could go here */}
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between pb-8 pointer-events-auto">
                {/* Gallery Thumbnail */}
                <div onClick={() => window.location.href = '/gallery'} className="w-12 h-12 rounded-lg bg-gray-800 border-2 border-white/20 overflow-hidden relative active:scale-95 transition-transform">
                    {lastImage ? (
                        <img src={lastImage} className="w-full h-full object-cover" alt="Last capture" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                            <span className="text-xs text-gray-500">Gallery</span>
                        </div>
                    )}
                </div>

                {/* Shutter Button */}
                <button
                    onClick={onCapture}
                    aria-label="Capture Evidence"
                    className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                    <div className="w-16 h-16 rounded-full bg-white shadow-lg" />
                </button>

                {/* Spacer to balance layout */}
                <div className="w-12 h-12" />
            </div>

        </div>
    );
};

export default CameraHUD;
