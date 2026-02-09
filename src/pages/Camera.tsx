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
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

        // Convert to Blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const imageUrl = URL.createObjectURL(blob);
            setLastImage(imageUrl); // Show preview immediately

            // 2. Mock Location (In real app, use Capacitor Geolocation)
            const location = { latitude: 40.4168, longitude: -3.7038, accuracy: 10 };

            console.log("Sealing evidence...");

            try {
                // 3. Seal Evidence (Hash + API)
                const { sealEvidence } = await import('../services/api');
                const result = await sealEvidence(blob, location);

                // Check if result is valid
                if (result.status === 'error') {
                    console.error("Sealing returned error status");
                    return;
                }

                console.log("Sealed!", result);

                // 4. Save to Storage
                const { StorageService } = await import('../services/storage');

                // 5. Save to Storage (Local + Cloud)
                // We cast result to satisfy type if needed, or rely on Structural Typing
                // Ensure 'status' compatibility if Strict 
                const evidenceRecord = {
                    ...result,
                    status: result.status as 'pending' | 'sealed', // Force cast if api.ts has 'error'
                    localPath: imageUrl,
                    location
                };

                if (user) {
                    await StorageService.saveEvidence(evidenceRecord, blob, user.id);
                } else {
                    await StorageService.saveEvidence(evidenceRecord);
                }

                // 6. Update UI (Already updated preview, but maybe show success toast)

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
