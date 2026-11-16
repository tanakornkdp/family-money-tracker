import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabase/config'

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
