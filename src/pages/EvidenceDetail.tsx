import React, { useState } from 'react';
import { IonContent, IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, useIonViewWillEnter } from '@ionic/react';
import { arrowBack, shareOutline } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { StorageService, type EvidenceRecord } from '../services/storage';
import { format } from 'date-fns';
import { ShieldCheck, MapPin, Hash, Calendar } from 'lucide-react';

const EvidenceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);
    const history = useHistory();

    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useIonViewWillEnter(() => {
        if (id) loadEvidence(id);
    });

    const loadEvidence = async (evidenceId: string) => {
        const data = await StorageService.getById(evidenceId);
        if (data) {
            setEvidence(data);

            // Determine best image source
            let loadedUrl: string | null = null;

            // 1. Try In-Memory Blob URL (Fastest)
            if (data.localPath && data.localPath.startsWith('blob:')) {
                try {
                    const res = await fetch(data.localPath);
                    if (res.ok) loadedUrl = data.localPath;
                } catch (e) { /* expired */ }
            }

            // 2. Try IndexedDB (Persistent)
            if (!loadedUrl) {
                const blob = await StorageService.getBlob(data.evidence_id);
                if (blob) {
                    loadedUrl = URL.createObjectURL(blob);
                }
            }

            // 3. Fallback to Cloud (Supabase Storage)
            if (!loadedUrl && data.storagePath) {
                const { supabase } = await import('../services/supabase');
                const { data: urlData } = await supabase.storage
                    .from('evidence-photos')
                    .createSignedUrl(data.storagePath, 3600);

                if (urlData?.signedUrl) {
                    loadedUrl = urlData.signedUrl;
                }
            }

            setImageUrl(loadedUrl);
        }
    };

    if (!evidence) return null;

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar style={{ '--background': '#000', '--color': '#fff' }}>
                    <IonButtons slot="start">
                        <IonButton onClick={() => history.goBack()} color="light">
                            <IonIcon icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Evidence Detail</IonTitle>
                    <IonButtons slot="end">
                        <IonButton color="light">
                            <IonIcon icon={shareOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="bg-black" style={{ '--background': '#000' }}>
                <div className="flex flex-col h-full">
                    {/* Main Image */}
                    <div className="relative aspect-[3/4] w-full bg-gray-900 flex items-center justify-center">
                        {imageUrl ? (
                            <img src={imageUrl} className="w-full h-full object-contain" alt="Evidence" />
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center gap-2">
                                <IonIcon icon={shareOutline} className="w-8 h-8 opacity-50" />
                                <span className="text-xs">Image not available</span>
                            </div>
                        )}
                    </div>

                    {/* Metadata Card */}
                    <div className="flex-1 bg-gray-900 p-6 rounded-t-3xl -mt-6 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-ead-blue" />
                                <span className="text-white font-bold text-lg">Qualified Sealed</span>
                                {evidence.synced && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-mono border border-green-500/30">
                                        CLOUD
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-gray-400 font-mono">{evidence.evidence_id}</span>
                        </div>

                        <div className="space-y-4">
                            {/* Timeline */}
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-gray-500 mt-1" />
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Timestamp</p>
                                    <p className="text-white font-mono">{format(new Date(evidence.created_at), 'PPP pp')}</p>
                                </div>
                            </div>

                            {/* Location */}
                            {evidence.location && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Location</p>
                                        <p className="text-white font-mono">
                                            {evidence.location.latitude.toFixed(6)}, {evidence.location.longitude.toFixed(6)}
                                        </p>
                                        <p className="text-xs text-gray-600">Accuracy: ±{evidence.location.accuracy}m</p>
                                    </div>
                                </div>
                            )}

                            {/* Digital Fingerprint */}
                            <div className="flex items-start gap-3 pt-4 border-t border-gray-800">
                                <Hash className="w-5 h-5 text-ead-blue mt-1" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs text-gray-500 uppercase">SHA-256 Fingerprint</p>
                                    <p className="text-xs text-ead-blue font-mono break-all leading-relaxed">
                                        {evidence.hash}
                                    </p>
                                </div>
                            </div>

                            {/* Verification Link */}
                            <div className="mt-8">
                                <button className="w-full py-3 bg-ead-blue rounded-lg text-white font-medium active:bg-blue-700 transition-colors">
                                    Download Certificate (PDF)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default EvidenceDetail;
