import { createClient } from '@supabase/supabase-js';

// Project: "truecam" (zugnnofnqmnqmgmddilh)
const supabaseUrl = 'https://zugnnofnqmnqmgmddilh.supabase.co';
const supabaseKey = 'sb_publishable_USgW86fDgQvM7sFLvoOECg_j1W89y7V';

export const supabase = createClient(supabaseUrl, supabaseKey);
