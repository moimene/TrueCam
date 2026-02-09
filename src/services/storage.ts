import { Preferences } from '@capacitor/preferences';
import type { SealResult, LocationData } from './api';

const EVIDENCE_KEY = 'truecam_evidence_log';

export interface EvidenceRecord extends SealResult {
    localPath?: string; // Path to file on device (if saved)
    location?: LocationData;
}

export const StorageService = {
    async saveEvidence(record: EvidenceRecord): Promise<void> {
        const history = await this.getHistory();
        history.unshift(record); // Add to top
        await Preferences.set({
            key: EVIDENCE_KEY,
            value: JSON.stringify(history),
        });
    },

    async getHistory(): Promise<EvidenceRecord[]> {
        const { value } = await Preferences.get({ key: EVIDENCE_KEY });
        return value ? JSON.parse(value) : [];
    },

    async clear(): Promise<void> {
        await Preferences.remove({ key: EVIDENCE_KEY });
    }
};
