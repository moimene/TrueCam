import { Preferences } from '@capacitor/preferences';




// Credentials are now handled by /api/qtsp-auth proxy


// Storage Keys
const TOKEN_KEY = 'qtsp_access_token';
const CASE_FILE_KEY = 'qtsp_active_case_file_id';

interface AuthResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

// Helper for consistent UUID generation
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const QtspService = {
    async getToken(): Promise<string | null> {
        // 1. Try to get from local storage
        const { value } = await Preferences.get({ key: TOKEN_KEY });
        if (value) return value; // TODO: Check expiration

        // 2. Authenticate
        // Proxy to /api/qtsp-auth handles the credentials


        try {
            // Use Vercel API Route proxy to avoid CORS and hide secrets
            const authUrl = import.meta.env.DEV ? '/api/qtsp-auth' : '/api/qtsp-auth'; // Same for now, but explicit is good

            // Note: We don't need to send client_secret here anymore, the proxy handles it.
            // But we can just call the endpoint.
            const res = await fetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
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

    async getOrCreateCaseFile(): Promise<string> {
        const token = await this.getToken();
        if (!token) throw new Error("Token retrieval failed");

        // Check if we have one cached
        const { value } = await Preferences.get({ key: CASE_FILE_KEY });
        if (value) return value;

        // Create New Case File
        try {
            // PROXY CALL: POST /v1/private/case-files
            const res = await fetch(`/api/qtsp-proxy?path=v1/private/case-files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: generateUUID(), // Client-generated ID required
                    name: `TrueCam-${Date.now()}`, // Short, simple alphanumeric name
                    description: "TrueCam Evidence Session",
                    actors: null
                })
            });

            if (!res.ok) {
                const text = await res.text();
                let errMsg = text;
                try {
                    const json = JSON.parse(text);
                    errMsg = json.details || json.error || text;
                } catch (e) { }

                throw new Error(`CaseFile Error (${res.status}): ${errMsg}`);
            }
            const data = await res.json();
            const id = data.id;

            await Preferences.set({ key: CASE_FILE_KEY, value: id });
            return id;
        } catch (e: any) {
            console.error("getOrCreateCaseFile failed:", e);
            throw e; // Propagate error
        }
    },

    async sealEvidence(blob: Blob, location: any): Promise<any> {
        try {
            const token = await this.getToken(); // Uses auth proxy
            if (!token) throw new Error("QTSP Auth Failed");

            const caseFileId = await this.getOrCreateCaseFile(); // Uses api proxy, now throws

            // 1. Create Evidence Group via PROXY
            const groupRes = await fetch(`/api/qtsp-proxy?path=v1/private/case-files/${caseFileId}/evidence-groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: generateUUID(), // Client-generated ID required
                    name: `Evidence-${Date.now()}`,
                    description: "Initial Evidence Group"
                })
            });
            if (!groupRes.ok) throw new Error('Create Group failed: ' + groupRes.status);
            const groupData = await groupRes.json();
            const groupId = groupData.id;

            // 2. Register Evidence via PROXY
            const fileName = `evidence_${new Date().getTime()}.jpg`;
            const evRes = await fetch(`/api/qtsp-proxy?path=v1/private/case-files/${caseFileId}/evidence-groups/${groupId}/evidences`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: generateUUID(), // Client-generated ID required
                    fileName: fileName,
                    fileSize: blob.size,
                    hash: "",
                    metadata: { location }
                })
            });
            if (!evRes.ok) throw new Error('Create Evidence failed: ' + evRes.status);
            const evData = await evRes.json();
            const evidenceId = evData.id;

            // 3. Get Upload URL via PROXY
            const urlRes = await fetch(`/api/qtsp-proxy?path=v1/private/case-files/${caseFileId}/evidence-groups/${groupId}/evidences/${evidenceId}/upload-url`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!urlRes.ok) throw new Error('Get Upload URL failed');
            const urlData = await urlRes.json();
            const uploadUrl = urlData.uploadUrl;

            // 4. Upload Content - DIRECT CALL (Usually supports CORS)
            // Note: If this fails with CORS, we need a separate streaming proxy, but usually GCS/S3 signed URLs are fine.
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': 'image/jpeg' }
            });
            if (!uploadRes.ok) throw new Error('Upload to QTSP failed');

            // 5. Close Group (Triggers Timestamp/Sealing) via PROXY
            await fetch(`/api/qtsp-proxy?path=v1/private/case-files/${caseFileId}/evidence-groups/${groupId}/close`, {
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

        } catch (e: any) {
            console.error("QTSP Process Failed:", e);
            // Return the actual error message to display in the UI
            return {
                status: 'local_only',
                error: e.message || "Unknown QTSP Error"
            };
        }
    }
};
