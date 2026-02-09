import React from 'react';
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { logoGoogle } from 'ionicons/icons';
import { useAuth } from '../services/auth';
import { Redirect } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { session, loading, signInWithGoogle } = useAuth();

    if (loading) {
        return (
            <IonPage>
                <IonContent className="bg-black">
                    <div className="flex items-center justify-center h-full bg-black">
                        <IonSpinner name="crescent" color="light" />
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    if (session) {
        return <Redirect to="/camera" />;
    }

    return (
        <IonPage>
            <IonContent fullscreen className="bg-black" style={{ '--background': '#000' }}>
                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8">

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-ead-blue/10 rounded-2xl flex items-center justify-center border border-ead-blue/20">
                            <ShieldCheck className="w-10 h-10 text-ead-blue" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">TrueCam</h1>
                        <p className="text-gray-400 max-w-xs">
                            Secure, qualified evidence capture for legal and forensic use.
                        </p>
                    </div>

                    <div className="w-full max-w-sm pt-8">
                        <IonButton
                            expand="block"
                            onClick={signInWithGoogle}
                            className="h-12 font-medium"
                            style={{ '--background': '#fff', '--color': '#000', '--border-radius': '12px' }}
                        >
                            <IonIcon icon={logoGoogle} slot="start" />
                            Sign in with Google
                        </IonButton>

                        <p className="mt-6 text-xs text-gray-600">
                            By continuing, you acknowledge that all captures are cryptographically signed and stored.
                        </p>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default LoginPage;
