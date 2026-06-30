'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateWorkerData {
  email: string;
  fullName: string;
  temporaryPassword: string;
  companyId: string;
}

/**
 * Server action for email/password login
 */
export async function loginWithEmail(credentials: LoginCredentials) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Fetch user profile to determine role
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', data.user.id)
    .single<{ role: string; company_id: string | null }>();

  if (profileError || !profileData) {
    return { error: 'Profile not found' };
  }

  // Check if user has a company assigned
  if (!profileData.company_id) {
    await supabase.auth.signOut();
    return { error: 'Your account has not been assigned to a company. Please contact your administrator.' };
  }

  return { success: true, role: profileData.role };
}

/**
 * Server action for admin to create worker accounts
 * ONLY admins can call this
 */
export async function createWorker(workerData: CreateWorkerData) {
  const supabase = await createServerSupabaseClient();

  // Verify the current user is an admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'Unauthorized: No user session found' };
  }

  // Check if current user is an admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { error: 'Unauthorized: Only administrators can create worker accounts' };
  }

  try {
    // Create auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: workerData.email,
      password: workerData.temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: workerData.fullName,
        role: 'worker',
        company_id: workerData.companyId,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Failed to create user account' };
    }

    // Note: The trigger handle_new_user() will automatically create the profile
    // with the metadata we provided (role='worker', company_id)

    return { 
      success: true, 
      message: `Worker account created successfully for ${workerData.email}`,
      userId: authData.user.id 
    };
  } catch (error: any) {
    console.error('Worker creation error:', error);
    return { error: error.message || 'Failed to create worker account' };
  }
}

/**
 * Server action for Google OAuth login
 */
export async function loginWithGoogle(redirectTo?: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/auth/callback${redirectTo ? `?redirect=${redirectTo}` : ''}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { success: true };
}

/**
 * Server action for logout
 */
export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Server action for password reset request
 */
export async function requestPasswordReset(email: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: 'Password reset email sent! Check your inbox.' };
}

/**
 * Server action for updating password
 */
export async function updatePassword(newPassword: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: 'Password updated successfully!' };
}

/**
 * Get current user session
 */
export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get current user profile with role
 */
export async function getUserProfile() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
