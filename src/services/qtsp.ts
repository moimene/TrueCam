import { Preferences } from '@capacitor/preferences';

const BASE_URL = import.meta.env.VITE_QTSP_BASE_URL;
const LOGIN_URL = import.meta.env.VITE_QTSP_LOGIN_URL;
const CLIENT_ID = import.meta.env.VITE_QTSP_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_QTSP_CLIENT_SECRET;
const SCOPE = import.meta.env.VITE_QTSP_SCOPE || 'token';

// Storage Keys
const TOKEN_KEY = 'qtsp_access_token';
const CASE_FILE_KEY = 'qtsp_active_case_file_id';

interface AuthResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

export const QtspService = {
    async getToken(): Promise<string | null> {
        // 1. Try to get from local storage
        const { value } = await Preferences.get({ key: TOKEN_KEY });
        if (value) return value; // TODO: Check expiration

        // 2. Authenticate
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.warn("QTSP Credentials missing");
            return null;
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', CLIENT_ID);
            params.append('client_secret', CLIENT_SECRET);
            params.append('scope', SCOPE);

            const res = await fetch(LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            if (!res.ok) throw new Error('Auth failed');

            const data: AuthResponse = await res.json();
            await Preferences.set({ key: TOKEN_KEY, value: data.access_token });
            return data.access_token;
        } catch (e) {
            console.error("QTSP Auth Error:", e);
            return null;
        }
    },

    async getOrCreateCaseFile(): Promise<string | null> {
        const token = await this.getToken();
        if (!token) return null;

        // Check if we have one cached
        const { value } = await Preferences.get({ key: CASE_FILE_KEY });
        if (value) return value; // Verify if it exists? For MVP assume yes.

        // Create New Case File
        try {
            const res = await fetch(`${BASE_URL}/v1/private/case-files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `TrueCam Session ${new Date().toISOString()}`,
                    description: "Evidence collected via TrueCam App",
                    actors: [] // Add relevant actors if needed
                })
            });

            if (!res.ok) throw new Error('Create Case File failed');
            const data = await res.json();
            const id = data.id; // Adjust based on actual response structure (id or uuid?)

            await Preferences.set({ key: CASE_FILE_KEY, value: id });
            return id;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async sealEvidence(blob: Blob, location: any): Promise<any> {
        const token = await this.getToken();
        const caseFileId = await this.getOrCreateCaseFile();
        if (!token) {
            console.log("QTSP: Skipping seal (Auth Failed)");
            return { status: 'local_only', error: 'QTSP Auth Failed' };
        }
        if (!caseFileId) {
            console.log("QTSP: Skipping seal (Case Creation Failed)");
            return { status: 'local_only', error: 'Case Creation Failed' };
        }

        try {
            // 1. Create Evidence Group
            const groupRes = await fetch(`${BASE_URL}/v1/private/case-files/${caseFileId}/evidence-groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `Evidence ${new Date().getTime()}`,
                    description: `Capture at ${location.latitude}, ${location.longitude}`
                })
            });
            if (!groupRes.ok) throw new Error('Create Group failed');
            const groupData = await groupRes.json();
            const groupId = groupData.id;

            // 2. Register Evidence
            const fileName = `evidence_${new Date().getTime()}.jpg`;
            const evRes = await fetch(`${BASE_URL}/v1/private/case-files/${caseFileId}/evidence-groups/${groupId}/evidences`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: fileName,
                    fileSize: blob.size,
                    hash: "", // Optional? Or we send calculated hash?
                    metadata: { location }
                })
            });
            if (!evRes.ok) throw new Error('Create Evidence failed');
            const evData = await evRes.json();
            const evidenceId = evData.id;

            // 3. Get Upload URL
            const urlRes = await fetch(`${BASE_URL}/v1/private/case-files/${caseFileId}/evidence-groups/${groupId}/evidences/${evidenceId}/upload-url`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!urlRes.ok) throw new Error('Get Upload URL failed');
            const urlData = await urlRes.json();
            const uploadUrl = urlData.uploadUrl; // check key name in spec

            // 4. Upload Content
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': 'image/jpeg' }
            });
            if (!uploadRes.ok) throw new Error('Upload to QTSP failed');

            // 5. Close Group (Triggers Timestamp/Sealing)
            await fetch(`${BASE_URL}/v1/private/case-files/${caseFileId}/evidence-groups/${groupId}/close`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                status: 'sealed',
                qtsp_id: evidenceId,
                case_file_id: caseFileId,
                timestamp: new Date().toISOString()
            };

        } catch (e) {
            console.error("QTSP Process Failed:", e);
            throw e;
        }
    }
};
