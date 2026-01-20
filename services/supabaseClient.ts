import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, these would be loaded from import.meta.env or process.env
// For this demo starter, we handle the case where they might be missing to prevent crashing.
const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check if supabase is actually connected (for UI purposes)
export const isSupabaseConfigured = (): boolean => {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
};