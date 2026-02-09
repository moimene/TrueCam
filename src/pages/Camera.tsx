import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import CameraHUD from '../components/layout/CameraHUD';
import { useAuth } from '../services/auth';

const Camera: React.FC = () => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [lastImage, setLastImage] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        startCamera();
        return () => {
            // Cleanup stream if needed
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current) return;

        // 1. Capture Frame
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw Video Frame
        ctx.drawImage(videoRef.current, 0, 0);

        // --- WATERMARKING START ---
        const width = canvas.width;
        const height = canvas.height;
        const timestamp = new Date();

        // 2. Get Real Location (if available)
        let location = { latitude: 0, longitude: 0, accuracy: 0 };
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            location = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
            };
        } catch (e) {
            console.warn("GPS not available or denied", e);
        }

        // 2. Load eIDAS Logo
        const logoImg = new Image();
        logoImg.src = '/assets/eidas-logo.png';

        // We need to wait for logo to load, or use a Promise wrapper. 
        // Since this is inside an async handler, we can wrap it.
        await new Promise<void>((resolve) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => {
                console.warn("eIDAS logo failed to lead, skipping watermark logo");
                resolve();
            };
            // Fallback timeout
            setTimeout(resolve, 500);
        });

        // 3. Draw Overlay Background (Bottom Gradient)
        const gradient = ctx.createLinearGradient(0, height - 200, 0, height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 200, width, 200);

        // 4. Draw eIDAS Logo (Bottom Right)
        const logoSize = width * 0.15; // 15% of screen width
        const padding = 20;
        if (logoImg.complete && logoImg.naturalWidth > 0) {
            ctx.drawImage(logoImg, width - logoSize - padding, height - logoSize - padding, logoSize, logoSize);
        }

        // 5. Draw Text (Bottom Left)
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;

        // Date & Time
        ctx.font = 'bold 24px monospace';
        const dateStr = timestamp.toLocaleDateString('en-GB') + ' ' + timestamp.toLocaleTimeString('en-GB'); // DD/MM/YYYY HH:mm:ss
        ctx.fillText(dateStr, padding, height - 80);

        // Location
        ctx.font = '16px monospace';
        if (location.latitude !== 0 || location.longitude !== 0) {
            const locStr = `LAT: ${location.latitude.toFixed(6)}  LON: ${location.longitude.toFixed(6)} ±${Math.round(location.accuracy)}m`;
            ctx.fillText(locStr, padding, height - 55);
        } else {
            ctx.fillText("GPS LOCATION UNAVAILABLE", padding, height - 55);
        }

        // Legal Text
        ctx.font = 'italic 14px sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.fillText("Qualified timestamping by QTSP EADTrust", padding, height - 30);
        // --- WATERMARKING END ---

        // Convert to Blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const imageUrl = URL.createObjectURL(blob);
            setLastImage(imageUrl); // Show preview immediately

            console.log("Sealing evidence...");

            try {
                // 3. Seal Evidence (Real QTSP Integration)
                const { QtspService } = await import('../services/qtsp');
                // Also import local API for hash calculation if needed, or rely on QtspService

                console.log("Starting QTSP Sealing...");
                const qtspResult = await QtspService.sealEvidence(blob, location);
                console.log("QTSP Result:", qtspResult);

                // 4. Save to Storage
                const { StorageService } = await import('../services/storage');

                // Calculate Hash locally for our verification portal
                const { sealEvidence: localSeal } = await import('../services/api');
                const localResult = await localSeal(blob, location);

                const evidenceRecord = {
                    ...localResult,
                    status: (qtspResult.status === 'sealed' ? 'sealed' : 'pending') as 'pending' | 'sealed',
                    localPath: imageUrl,
                    location,
                    metadata: {
                        qtsp_data: qtspResult
                    }
                };

                if (user) {
                    await StorageService.saveEvidence(evidenceRecord, blob, user.id);
                } else {
                    await StorageService.saveEvidence(evidenceRecord);
                }

            } catch (error) {
                console.error("Sealing/Saving failed:", error);
            }

        }, 'image/jpeg', 0.95);
    };

    return (
        <IonPage>
            <IonContent fullscreen>
                <div className="relative h-full w-full bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                    />

                    {/* HUD Overlay */}
                    <div className="absolute inset-0 z-10">
                        <CameraHUD onCapture={handleCapture} lastImage={lastImage} />
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Camera;
