import React from 'react';
import { format } from 'date-fns';
import { ShieldCheck, Clock } from 'lucide-react';
import type { EvidenceRecord } from '../../services/storage';

// Update Props to just take evidence. We handle image loading inside.
import { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';

interface EvidenceCardProps {
    evidence: EvidenceRecord;
    onClick: () => void;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, onClick }) => {
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadThumb = async () => {
            // 1. Try Blob URL
            if (evidence.localPath) {
                try {
                    const res = await fetch(evidence.localPath);
                    if (res.ok) {
                        setThumbUrl(evidence.localPath);
                        return;
                    }
                } catch { }
            }
            // 2. Try IDB
            const blob = await StorageService.getBlob(evidence.evidence_id);
            if (blob) {
                setThumbUrl(URL.createObjectURL(blob));
                return;
            }
            // 3. Cloud (not implementing for thumbnail performace unless critical)
        };
        loadThumb();
    }, [evidence]);

    return (
        <div onClick={onClick} className="relative aspect-square rounded-xl overflow-hidden bg-gray-900 border border-gray-800 active:scale-95 transition-transform">
            {/* Image Thumbnail */}
            {thumbUrl ? (
                <img src={thumbUrl} alt="Evidence" className="w-full h-full object-cover opacity-80" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <span className="text-xs text-gray-500">No Image</span>
                </div>
            )}

            {/* Overlay Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-300">
                        {format(new Date(evidence.created_at), 'HH:mm')}
                    </span>

                    {evidence.status === 'sealed' ? (
                        <div className="flex items-center gap-1">
                            {evidence.synced && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                            <ShieldCheck className="w-4 h-4 text-ead-blue" />
                        </div>
                    ) : (
                        <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                </div>
            </div>

            {/* Status Badge */}
            <div className="absolute top-2 right-2">
                <div className={`w-2 h-2 rounded-full ${evidence.status === 'sealed' ? 'bg-ead-blue shadow-[0_0_8px_rgba(0,82,204,0.6)]' : 'bg-yellow-500'}`} />
            </div>
        </div>
    );
};

export default EvidenceCard;
