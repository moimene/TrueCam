import React, { useState, useCallback } from 'react';
import { IonContent, IonPage, IonIcon, IonSpinner } from '@ionic/react';
import { cloudUploadOutline, checkmarkCircle, alertCircle } from 'ionicons/icons';
import { calculateHash } from '../services/crypto';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import { ShieldCheck, MapPin } from 'lucide-react';

interface VerificationResult {
    found: boolean;
    data?: {
        id: string;
        verified_at: string;
        location_lat: number;
        location_lon: number;
    };
    originalHash?: string;
}

const VerifyPage: React.FC = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);

    const handleVerify = async (file: File) => {
        setVerifying(true);
        setResult(null);

        try {
            // 1. Calculate Hash locally
            const hash = await calculateHash(file);
            console.log("Calculated Hash:", hash);

            // 2. Query Supabase RPC
            const { data, error } = await supabase.rpc('verify_evidence_hash', {
                lookup_hash: hash
            });

            if (error) throw error;

            console.log("RPC Result:", data);

            if (data && data.length > 0) {
                setResult({
                    found: true,
                    data: data[0],
                    originalHash: hash
                });
            } else {
                setResult({
                    found: false,
                    originalHash: hash
                });
            }

        } catch (err) {
            console.error("Verification failed:", err);
            setResult({ found: false });
        } finally {
            setVerifying(false);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleVerify(e.dataTransfer.files[0]);
        }
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    return (
        <IonPage>
            <IonContent fullscreen className="bg-black">
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white">

                    <div className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ead-blue/10 border border-ead-blue/30 mb-6">
                            <ShieldCheck className="w-8 h-8 text-ead-blue" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Evidence Verification</h1>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Drag and drop a TrueCam "Sealed Evidence" file to verify its authenticity against the immutable ledger.
                        </p>
                    </div>

                    {/* Result Card */}
                    {result && (
                        <div className={`w-full max-w-lg p-6 rounded-2xl border mb-8 animate-fade-in ${result.found ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="flex items-center gap-4 mb-4">
                                <IonIcon
                                    icon={result.found ? checkmarkCircle : alertCircle}
                                    className={`w-8 h-8 ${result.found ? 'text-green-400' : 'text-red-400'}`}
                                />
                                <div>
                                    <h3 className={`text-lg font-bold ${result.found ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.found ? 'AUTHENTIC EVIDENCE' : 'VERIFICATION FAILED'}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono break-all line-clamp-1">
                                        Hash: {result.originalHash}
                                    </p>
                                </div>
                            </div>

                            {result.found && result.data && (
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Timestamp</span>
                                        <span className="font-mono text-sm">{format(new Date(result.data.verified_at), 'PPP pp')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Location</span>
                                        <div className="flex items-center gap-1 text-sm font-mono">
                                            <MapPin className="w-3 h-3 text-gray-500" />
                                            {result.data.location_lat.toFixed(5)}, {result.data.location_lon.toFixed(5)}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-sm text-gray-400">Issuer</span>
                                        <span className="text-sm font-medium text-ead-blue">QTSP EADTrust</span>
                                    </div>
                                </div>
                            )}

                            {!result.found && (
                                <p className="text-sm text-gray-300">
                                    This file's digital fingerprint does not match any record in our ledger. It may have been modified or was not captured by a certified TrueCam device.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Upload Zone */}
                    {!result && (
                        <div
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            className={`w-full max-w-lg h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging
                                ? 'border-ead-blue bg-ead-blue/10 scale-105'
                                : 'border-white/20 bg-white/5 hover:border-white/40'
                                }`}
                        >
                            {verifying ? (
                                <IonSpinner name="crescent" color="light" />
                            ) : (
                                <>
                                    <IonIcon icon={cloudUploadOutline} className="w-12 h-12 text-gray-400 mb-4" />
                                    <p className="text-gray-300 font-medium">Drop Evidence File Here</p>
                                    <p className="text-sm text-gray-500 mt-2">.JPG / .JPEG</p>

                                    <label className="mt-6 px-6 py-2 bg-white text-black rounded-full font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer">
                                        Select File
                                        <input
                                            type="file"
                                            accept="image/jpeg"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.[0] && handleVerify(e.target.files[0])}
                                        />
                                    </label>
                                </>
                            )}
                        </div>
                    )}

                    {result && (
                        <button
                            onClick={() => setResult(null)}
                            className="text-gray-400 hover:text-white transition-colors text-sm mt-8 border-b border-transparent hover:border-white"
                        >
                            Verify Another File
                        </button>
                    )}

                </div>
            </IonContent>
        </IonPage>
    );
};

export default VerifyPage;
