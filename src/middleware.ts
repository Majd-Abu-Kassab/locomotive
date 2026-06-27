import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Session inactivity timeout — users will be signed out after this many minutes of no activity
const SESSION_TIMEOUT_MINUTES = 60;

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
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
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh the session (important for keeping auth alive)
    const { data: { user } } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // ===== E1: Session inactivity timeout =====
    if (user) {
        const lastActivityCookie = request.cookies.get('loco_last_activity')?.value;
        const now = Date.now();

        if (lastActivityCookie) {
            const lastActivity = parseInt(lastActivityCookie, 10);
            const elapsed = now - lastActivity;
            const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

            if (elapsed > timeoutMs) {
                // Session has been inactive too long — sign out and redirect
                await supabase.auth.signOut();
                const url = request.nextUrl.clone();
                url.pathname = '/login';
                url.searchParams.set('reason', 'session_expired');
                const redirect = NextResponse.redirect(url);
                // Clear the activity cookie
                redirect.cookies.delete('loco_last_activity');
                return redirect;
            }
        }

        // Refresh last-activity timestamp on every authenticated request
        supabaseResponse.cookies.set('loco_last_activity', String(now), {
            httpOnly: true,
            sameSite: 'lax',
            // No 'secure' needed — handled by HSTS in next.config.ts
            path: '/',
        });
    } else {
        // No user — clear any stale activity cookie
        supabaseResponse.cookies.delete('loco_last_activity');
    }

    // Public routes that don't require auth
    const publicRoutes = ['/login', '/register', '/', '/auth/callback', '/faq', '/contact'];
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith('/auth/')
    );

    // If user is NOT logged in and trying to access protected route
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // If user IS logged in and trying to access login/register
    if (user && (pathname === '/login' || pathname === '/register')) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    // ===== H1: Admin route protection (server-side) =====
    if (pathname.startsWith('/admin')) {
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }

        // Fetch admin_role directly — avoids relying on client-side profile state
        const { data: profile } = await supabase
            .from('profiles')
            .select('admin_role')
            .eq('id', user.id)
            .single();

        if (!profile?.admin_role) {
            // Authenticated but not an admin — redirect to dashboard
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        // Match all routes except static files and Next.js internals
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
