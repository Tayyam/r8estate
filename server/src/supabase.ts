import WebSocket from 'ws';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './env.js';

(globalThis as unknown as { WebSocket: typeof globalThis.WebSocket }).WebSocket =
  WebSocket as unknown as typeof globalThis.WebSocket;

export const adminClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});