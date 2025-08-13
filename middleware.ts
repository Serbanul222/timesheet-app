// Replace your existing middleware.ts with this corrected version:

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  const protectedPaths = ['/timesheets', '/employees', '/admin']
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )
  
  const authPaths = ['/login', '/auth/set-password', '/auth/reset-password']
  const isAuthPath = authPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )
  
  // If accessing protected path without session, redirect to login
  if (!session && isProtectedPath) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // If we have a session, allow the request to proceed.
  if (session?.user) {
    // We remove the profile check from the middleware. The client-side useAuth
    // hook will now be responsible for creating the profile if it doesn't exist.
      
    // Allow access to the password setup pages
    if (isAuthPath) {
      return res; 
    }

    // If accessing the login page while authenticated, redirect to the app's main page
    if (req.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/timesheets', req.url))
    }
  }
  
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}