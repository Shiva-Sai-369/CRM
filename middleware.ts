import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createSSRClient } from '@supabase/ssr';

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Routes that are always public — no auth required. */
const PUBLIC_ROUTES = new Set(['/login']);

/** Route prefixes always allowed through (Next internals, API, static). */
const BYPASS_PREFIXES = ['/_next', '/favicon', '/api'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Analytics routes: /analytics/[projectId] — client home */
function isAnalyticsRoute(pathname: string): boolean {
  return /^\/analytics\/\d+/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const startTotal = performance.now();

  // Build a response we can mutate cookies on
  let response = NextResponse.next({ request });

  // Create the SSR supabase client — it will read/write cookies from the request
  const supabase = createSSRClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresh session if expired — important for SSR
  const startAuth = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const endAuth = performance.now();

  // Not authenticated → /login
  if (!user) {
    console.log(`[Middleware] [${pathname}] Auth check: ${(endAuth - startAuth).toFixed(2)}ms | Total: ${(performance.now() - startTotal).toFixed(2)}ms`);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Fetch the user's profile to get their role
  const startProfile = performance.now();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const endProfile = performance.now();

  const role = (profile as { role?: string } | null)?.role ?? null;

  // ── CLIENT ──────────────────────────────────────────────────────────────────
  if (role === 'client') {
    // Clients may only visit /analytics/[projectId]
    if (!isAnalyticsRoute(pathname)) {
      // Find their assigned project and redirect there
      const startAssign = performance.now();
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', user.id)
        .limit(1);
      const endAssign = performance.now();

      const projectId = (assignments as Array<{ project_id: number }> | null)?.[0]?.project_id;
      console.log(`[Middleware] [${pathname}] Auth: ${(endAuth - startAuth).toFixed(2)}ms | Profile: ${(endProfile - startProfile).toFixed(2)}ms | Assign: ${(endAssign - startAssign).toFixed(2)}ms | Total: ${(performance.now() - startTotal).toFixed(2)}ms`);
      if (projectId) {
        const analyticsUrl = request.nextUrl.clone();
        analyticsUrl.pathname = `/analytics/${projectId}`;
        return NextResponse.redirect(analyticsUrl);
      }
      return response;
    }
    console.log(`[Middleware] [${pathname}] Auth: ${(endAuth - startAuth).toFixed(2)}ms | Profile: ${(endProfile - startProfile).toFixed(2)}ms | Total: ${(performance.now() - startTotal).toFixed(2)}ms`);
    return response;
  }

  // ── TEAM_MEMBER ─────────────────────────────────────────────────────────────
  if (role === 'team_member') {
    // Block access to client analytics pages
    if (isAnalyticsRoute(pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/projects';
      return NextResponse.redirect(homeUrl);
    }

    // Team management is super_admin only
    if (pathname.startsWith('/team')) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/projects';
      return NextResponse.redirect(homeUrl);
    }

    // Check if they have any project assignments
    const startAssign = performance.now();
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('user_id', user.id)
      .limit(1);
    const endAssign = performance.now();

    const hasProjects = (assignments?.length ?? 0) > 0;
    console.log(`[Middleware] [${pathname}] Auth: ${(endAuth - startAuth).toFixed(2)}ms | Profile: ${(endProfile - startProfile).toFixed(2)}ms | Assign: ${(endAssign - startAssign).toFixed(2)}ms | Total: ${(performance.now() - startTotal).toFixed(2)}ms`);
    if (!hasProjects && pathname !== '/no-projects') {
      const noProjectsUrl = request.nextUrl.clone();
      noProjectsUrl.pathname = '/no-projects';
      return NextResponse.redirect(noProjectsUrl);
    }

    return response;
  }

  // ── SUPER_ADMIN ─────────────────────────────────────────────────────────────
  // super_admin: block client analytics pages (they use the full CRM, not the analytics view)
  if (role === 'super_admin' && isAnalyticsRoute(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/projects';
    return NextResponse.redirect(homeUrl);
  }

  console.log(`[Middleware] [${pathname}] Auth: ${(endAuth - startAuth).toFixed(2)}ms | Profile: ${(endProfile - startProfile).toFixed(2)}ms | Total: ${(performance.now() - startTotal).toFixed(2)}ms`);

  // Profile missing or unknown role — send to login
  if (!role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run middleware on all paths except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
