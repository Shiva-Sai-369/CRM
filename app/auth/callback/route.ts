import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type ProfileData = {
  role: string;
  company_id: string | null;
};

// Helper function to retry profile fetch with delays
async function fetchProfileWithRetry(supabase: any, userId: string, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', userId)
        .single<ProfileData>();

      if (data && !error) {
        return { data, error: null };
      }

      // If error and not last retry, wait and try again
      if (i < maxRetries - 1) {
        // Wait increasing amount of time (500ms, 1000ms, etc)
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 500));
        continue;
      }

      return { data: null, error };
    } catch (err) {
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 500));
        continue;
      }
      throw err;
    }
  }

  return { data: null, error: 'Max retries exceeded' };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || undefined;

  if (code) {
    const supabase = await createServerSupabaseClient();
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      console.log('User logged in with OAuth:', data.user.email);
      
      // Fetch user profile to determine role (with retries for trigger execution)
      const { data: profileData, error: profileError } = await fetchProfileWithRetry(supabase, data.user.id);

      if (profileError || !profileData) {
        console.error('Profile error after retries:', profileError);
        // Still no profile after retries - might be first-time user
        // Give them one more chance by redirecting to login which will complete signup
        return NextResponse.redirect(`${requestUrl.origin}/login?oauth=complete&email=${encodeURIComponent(data.user.email || '')}`);
      }

      console.log('User profile found:', { role: profileData.role, company_id: profileData.company_id });

      // Check if user has a company assigned
      if (!profileData.company_id) {
        console.error('No company assigned to user:', data.user.id);
        return NextResponse.redirect(`${requestUrl.origin}/login?error=no_company`);
      }

      // Redirect based on role
      if (profileData.role === 'admin') {
        console.log('Redirecting admin to dashboard');
        return NextResponse.redirect(`${requestUrl.origin}/admin/dashboard`);
      } else {
        console.log('Redirecting worker to dashboard');
        return NextResponse.redirect(`${requestUrl.origin}/worker/dashboard`);
      }
    }
  }

  // If no code or no user, redirect to login
  console.log('No code or user found, redirecting to login');
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
