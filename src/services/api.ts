import { calculateHash } from './crypto';

const API_BASE_URL = 'https://api.eadtrust.provider/v1'; // Mock URL
const MOCK_DELAY = 1500; // Simulate network latency

export interface SealResult {
    evidence_id: string;
    timestamp_token: string;
    status: 'sealed' | 'pending' | 'error';
    created_at: string;
    hash: string;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
}

/**
 * Simulates uploading the file hash to EADTrust QTSP.
 * In a real app, this would make a fetch() request.
 */
export async function sealEvidence(file: Blob, location: LocationData): Promise<SealResult> {
    const hash = await calculateHash(file);

    // Use constants to avoid lint errors in mock
    console.log(`[TrueCam] Sealing evidence... Hash: ${hash} | Location: ${location.latitude},${location.longitude} | Target: ${API_BASE_URL}`);

    // Provisional Mock Implementation
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                evidence_id: `ev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                timestamp_token: "MOCK_CMS_SIGNATURE_" + hash.substring(0, 10),
                status: 'sealed',
                created_at: new Date().toISOString(),
                hash: hash
            });
        }, MOCK_DELAY);
    });
}
