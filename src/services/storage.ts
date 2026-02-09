import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';

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
    localPath?: string; // Local filesystem URI
    storagePath?: string; // Supabase Storage path
    synced?: boolean;
}

export const StorageService = {
    async saveEvidence(record: EvidenceRecord, fileBlob?: Blob, userId?: string): Promise<void> {
        // 1. Upload to Supabase Storage if online & user authenticated
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

                // 2. Insert into Supabase DB
                const { error: dbError } = await supabase.from('evidence').insert({
                    id: record.evidence_id, // Use same ID if possible, or let DB generate
                    user_id: userId,
                    hash: record.hash,
                    latitude: record.location?.latitude,
                    longitude: record.location?.longitude,
                    created_at: record.created_at,
                    metadata: {
                        local_path: record.localPath,
                        storage_path: data.path
                    }
                });

                if (dbError) {
                    console.error('Database insert error:', dbError);
                    record.synced = false; // Uploaded but DB failed? Partial sync.
                }

            } catch (error) {
                console.error('Cloud upload failed:', error);
                record.synced = false;
            }
        } else {
            record.synced = false;
        }

        // 3. Save to Local History
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

    async clear(): Promise<void> {
        await Preferences.remove({ key: EVIDENCE_KEY });
    }
};
