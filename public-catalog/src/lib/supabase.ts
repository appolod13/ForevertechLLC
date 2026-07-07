import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const getServiceSupabase = (opts?: { requireServiceRole?: boolean }) => {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl) return null;
  if (serviceKey) return createClient(supabaseUrl, serviceKey);
  if (opts?.requireServiceRole) return null;
  if (supabaseAnonKey) return createClient(supabaseUrl, supabaseAnonKey);
  return null;
};
