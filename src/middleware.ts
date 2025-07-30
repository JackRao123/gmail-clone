// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
    matcher: ['/:path*'], // run on all routes
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    const IGNORE_PATHS = ['/_next', '/static', '/favicon.ico', '/api'];

    // if the path starts with any of these then, skip auth
    if (IGNORE_PATHS.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.next()
    }

    // check for AuthJS v5 session cookie (secure vs non‑secure name)
    const token =
        request.cookies.get('authjs.session-token')?.value ?? request.cookies.get('__Secure-authjs.session-token')?.value

    if (!token) {
        if (!request.url.includes('/signin')) {
            return NextResponse.redirect(new URL('/signin', request.url))
        }
        return NextResponse.next()
    }

    if (token && request.url == "/signin") {
        return NextResponse.redirect(new URL('/inbox', request.url))
    }

    const VALID_PATHS = new Set([
        '/inbox',
        // TODO ADD MORE
    ])

    const VALID_PREFIXES = new Set([
        '/inbox'
    ])

    if (VALID_PATHS.has(pathname)) {
        return NextResponse.next()
    }

    for (const prefix of VALID_PREFIXES) {
        if (pathname.startsWith(prefix)) {
            return NextResponse.next()
        }
    }


    return NextResponse.redirect(new URL('/inbox', request.url))
}