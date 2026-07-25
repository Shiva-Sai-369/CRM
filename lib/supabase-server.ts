/**
 * lib/supabase-server.ts
 *
 * Server-side Supabase clients using @supabase/ssr.
 * - createServerClient()  → uses cookies for session (Server Components, middleware, route handlers)
 * - createAdminClient()   → uses SERVICE_ROLE_KEY, bypasses RLS, server-only
 *
 * NEVER import createAdminClient in client components.
 */
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

/**
 * Creates a Supabase client that reads/writes the user session from cookies.
 * Use this in Server Components, API Route Handlers, and middleware.
 */
export function createServerClient() {
  const cookieStore = cookies();
  return createSSRClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll is called in a Server Component — ignore if cookies are read-only
        }
      },
    },
  });
}

/**
 * Creates a Supabase admin client using the service role key.
 * Bypasses RLS — only use on the server in trusted API routes.
 */
export function createAdminClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY — add it to .env.local. ' +
        'Find it in your Supabase project Settings → API.'
    );
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
