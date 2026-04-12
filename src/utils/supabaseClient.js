import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const APP_STATE_ROW_ID = 'badminton-expense-calculator-state';

export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;
if (isSupabaseEnabled) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const pullRemoteState = async () => {
  if (!client) return null;

  const { data, error } = await client
    .from('app_state')
    .select('payload')
    .eq('app_id', APP_STATE_ROW_ID)
    .maybeSingle();

  if (error) {
    console.warn('Supabase pull failed:', error.message);
    return null;
  }

  return data?.payload || null;
};

export const pushRemoteState = async (payload) => {
  if (!client) return false;

  const { error } = await client
    .from('app_state')
    .upsert(
      {
        app_id: APP_STATE_ROW_ID,
        payload,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'app_id' }
    );

  if (error) {
    console.warn('Supabase push failed:', error.message);
    return false;
  }

  return true;
};