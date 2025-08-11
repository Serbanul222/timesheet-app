// Replace your existing middleware.ts with this:

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
  
  // If we have a session, validate the user exists in our database
  if (session?.user) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', session.user.id)
        .single()
      
      // If user doesn't exist in our profiles table, sign them out
      if (error || !profile) {
        console.log('Middleware: User not in database, signing out:', session.user.email)
        
        await supabase.auth.signOut()
        
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(loginUrl)
      }
      
      // If accessing auth pages while authenticated, redirect to app
      if (isAuthPath && req.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/timesheets', req.url))
      }
      
    } catch (dbError) {
      console.error('Middleware: Database check failed:', dbError)
      // On database errors, allow the request to continue
    }
  }
  
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}