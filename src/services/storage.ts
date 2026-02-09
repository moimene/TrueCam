import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';
import { set as idbSet, get as idbGet } from 'idb-keyval';

const EVIDENCE_KEY = 'evidence_history';

export interface EvidenceRecord {
    evidence_id: string;
    hash: string;
    created_at: string;
    status: 'pending' | 'sealed';
    location?: {
        latitude: number;
        longitude: number;
        accuracy: number;
    };
    localPath?: string; // Local filesystem URI (Blob URL, expires)
    storagePath?: string; // Supabase Storage path
    synced?: boolean;
}

export const StorageService = {
    async saveEvidence(record: EvidenceRecord, fileBlob?: Blob, userId?: string): Promise<void> {
        // 1. Save Blob Locally (IndexedDB) regardless of Auth
        if (fileBlob) {
            try {
                await idbSet(`evidence_${record.evidence_id}`, fileBlob);
                console.log('Blob saved locally to IndexedDB');
            } catch (e) {
                console.error('Failed to save to IndexedDB', e);
            }
        }

        // 2. Upload to Supabase Storage if online & user authenticated
        if (fileBlob && userId) {
            try {
                const fileName = `${userId}/${record.evidence_id}.jpg`;
                const { data, error } = await supabase.storage
                    .from('evidence-photos')
                    .upload(fileName, fileBlob, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });

                if (error) throw error;

                record.storagePath = data.path;
                record.synced = true;

                // 3. Insert into Supabase DB
                const { error: dbError } = await supabase.from('evidence').insert({
                    id: record.evidence_id,
                    user_id: userId,
                    hash: record.hash,
                    latitude: record.location?.latitude,
                    longitude: record.location?.longitude,
                    created_at: record.created_at,
                    metadata: {
                        local_path: record.localPath, // Note: this is ephemeral
                        storage_path: data.path
                    }
                });

                if (dbError) {
                    console.error('Database insert error:', dbError);
                    record.synced = false;
                }

            } catch (error) {
                console.error('Cloud upload failed:', error);
                record.synced = false;
            }
        } else {
            record.synced = false;
        }

        // 4. Save to Local History
        const history = await this.getHistory();
        history.unshift(record);
        await Preferences.set({
            key: EVIDENCE_KEY,
            value: JSON.stringify(history),
        });
    },

    async getHistory(): Promise<EvidenceRecord[]> {
        const { value } = await Preferences.get({ key: EVIDENCE_KEY });
        return value ? JSON.parse(value) : [];
    },

    async getById(id: string): Promise<EvidenceRecord | undefined> {
        const history = await this.getHistory();
        return history.find(r => r.evidence_id === id);
    },

    async getBlob(id: string): Promise<Blob | undefined> {
        return await idbGet(`evidence_${id}`);
    },

    async clear(): Promise<void> {
        await Preferences.remove({ key: EVIDENCE_KEY });
    }
};
