import React, { useState } from 'react';
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, useIonViewWillEnter } from '@ionic/react';
import { arrowBack } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { StorageService, type EvidenceRecord } from '../services/storage';
import EvidenceCard from '../components/evidence/EvidenceCard';

const GalleryPage: React.FC = () => {
    const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
    const history = useHistory();

    useIonViewWillEnter(() => {
        loadEvidence();
    });

    const loadEvidence = async () => {
        const data = await StorageService.getHistory();
        setEvidenceList(data);
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="bg-black text-white" style={{ '--background': '#000', '--color': '#fff' }}>
                    <IonButtons slot="start">
                        <IonButton onClick={() => history.push('/camera')} color="light">
                            <IonIcon icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Evidence Gallery</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="bg-black" style={{ '--background': '#000' }}>
                <div className="p-4 grid grid-cols-2 gap-4">
                    {evidenceList.map((item) => (
                        <EvidenceCard
                            key={item.evidence_id}
                            evidence={item}
                            onClick={() => history.push(`/evidence/${item.evidence_id}`)}
                        />
                    ))}

                    {evidenceList.length === 0 && (
                        <div className="col-span-2 text-center py-20 text-gray-500">
                            <p>No evidence captured yet.</p>
                        </div>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default GalleryPage;
