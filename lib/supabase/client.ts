import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Create a Supabase client for client-side operations
 * Uses the public anon key - safe for browser use
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
