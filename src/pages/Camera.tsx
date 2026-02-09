import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import CameraHUD from '../components/layout/CameraHUD';

const CameraPage: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);

    // For this version we use standard Capacitor Camera plugin which opens native UI
    // But Design Spec asks for custom HUD. 
    // To achieve custom HUD over camera, we need @capacitor-community/camera-preview
    // However, for MVP stability, we might use standard Camera plugin first, 
    // or overlay HTML on top of transparent background if using preview.

    // Let's implement the standard Camera flow first as per "High Availability" requirement.
    // The user wants "Open app -> Point -> Shoot".
    // Standard plugin launches a separate native intent.
    // Community preview allows embedded HTML overlay.
    // Given the "Design Spec" has specific HUD elements, we should aim for Preview if possible.
    // But to guarantee stability in this iteration, I will simulate the HUD on a "Ready" screen
    // that launches the native camera immediately or uses the preview.

    // Decision: Use standard Camera plugin for V1 reliability.
    // User can click a big button to launch native camera.
    // OR, better, use a simple HTML video element with getUserMedia for web, 
    // and Capacitor Camera for native.

    // Actually, for "TrueCam", the "Seal" animation is key.
    // I'll implement a full-screen viewfinder using HTML5 Video (works on mobile web & capacitor webview)
    // This allows the custom HUD overlay.

    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
        startCamera();
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
            setImage(imageUrl); // Show preview immediately

            // 2. Mock Location (In real app, use Capacitor Geolocation)
            // For MVP we mock it to ensure flow works without permissions first
            const location = { latitude: 40.4168, longitude: -3.7038, accuracy: 10 };

            console.log("Sealing evidence...");

            try {
                // 3. Seal Evidence (Hash + API)
                // We use dynamic imports here to keep the initial load fast
                const { sealEvidence } = await import('../services/api');
                const result = await sealEvidence(blob, location);

                console.log("Sealed!", result);

                // 4. Save to Storage
                const { StorageService } = await import('../services/storage');
                await StorageService.saveEvidence({
                    ...result,
                    localPath: imageUrl, // In a real app we would write blob to Filesystem
                    location
                });

            } catch (error) {
                console.error("Sealing failed:", error);
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

                    <CameraHUD onCapture={handleCapture} lastImage={image} />
                </div>
            </IonContent>
        </IonPage>
    );
};

export default CameraPage;
