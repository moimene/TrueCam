import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Camera from './pages/Camera';
import GalleryPage from './pages/Gallery';
import EvidenceDetail from './pages/EvidenceDetail';
import LoginPage from './pages/Login';
import { AuthProvider, useAuth } from './services/auth';

setupIonicReact();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) return null; // Or a loading spinner
  return session ? <>{children}</> : <Redirect to="/login" />;
};

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login">
            <LoginPage />
          </Route>
          <Route exact path="/camera">
            <PrivateRoute>
              <Camera />
            </PrivateRoute>
          </Route>
          <Route exact path="/gallery">
            <PrivateRoute>
              <GalleryPage />
            </PrivateRoute>
          </Route>
          <Route exact path="/evidence/:id">
            <PrivateRoute>
              <EvidenceDetail />
            </PrivateRoute>
          </Route>
          <Route exact path="/">
            <Redirect to="/camera" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
