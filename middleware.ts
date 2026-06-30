import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Path: ${pathname}, User: ${user?.email || 'none'}`);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    console.log(`[Middleware] No user, redirecting to /login`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access public routes
  if (user && isPublicRoute && pathname !== '/auth/callback') {
    console.log(`[Middleware] User on public route, checking role...`);
    
    // Fetch user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(`[Middleware] Profile error:`, profileError);
    }

    // Check if user has a company assigned
    if (profile && !profile.company_id) {
      console.log(`[Middleware] No company assigned, keeping on login`);
      return response;
    }

    const url = request.nextUrl.clone();
    
    // Redirect based on role
    if (profile?.role === 'admin') {
      url.pathname = '/admin/dashboard';
      console.log(`[Middleware] Redirecting admin to /admin/dashboard`);
    } else {
      url.pathname = '/worker/dashboard';
      console.log(`[Middleware] Redirecting worker to /worker/dashboard`);
    }
    
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  if (user && !isPublicRoute) {
    console.log(`[Middleware] Protected route access, checking role...`);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(`[Middleware] Profile error:`, profileError);
    }

    // Check if user has a company assigned
    if (profile && !profile.company_id) {
      console.log(`[Middleware] No company assigned, redirecting to login`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Protect admin routes
    if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
      console.log(`[Middleware] Worker accessing admin route, blocking`);
      const url = request.nextUrl.clone();
      url.pathname = '/worker/dashboard';
      return NextResponse.redirect(url);
    }

    // Protect worker routes
    if (pathname.startsWith('/worker') && profile?.role !== 'worker') {
      console.log(`[Middleware] Admin accessing worker route, blocking`);
      const url = request.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }

    // Redirect root to appropriate dashboard
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/enquiries') {
      const url = request.nextUrl.clone();
      
      if (profile?.role === 'admin') {
        url.pathname = '/admin/dashboard';
        console.log(`[Middleware] Root redirect to admin dashboard`);
      } else {
        url.pathname = '/worker/dashboard';
        console.log(`[Middleware] Root redirect to worker dashboard`);
      }
      
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
