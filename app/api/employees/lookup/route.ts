// app/api/employees/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { EmployeeLookupService } from '@/lib/services/employeeLookupService'
import { 
  EmployeeLookupRequestSchema,
  EmployeeSearchRequestSchema,
  createLookupResponse,
  createSearchResponse,
  LOOKUP_ERROR_CODES,
  ExternalEmployeeLookupError,
  EXTERNAL_DB_CONFIG
} from '@/types/externalEmployee'
import { z } from 'zod'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * GET /api/employees/lookup?email=example@lensa.com
 * Lookup single employee by exact email match
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check rate limiting
    const clientId = getClientId(request)
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        createLookupResponse(false, undefined, 'Rate limit exceeded'),
        { status: 429 }
      )
    }

    // Extract and validate query parameters
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const exactMatch = searchParams.get('exactMatch') !== 'false'
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (!email) {
      return NextResponse.json(
        createLookupResponse(false, undefined, 'Email parameter is required'),
        { status: 400 }
      )
    }

    // Validate request data
    const validatedData = EmployeeLookupRequestSchema.parse({
      email,
      exactMatch,
      includeInactive
    })

    console.log('Employee lookup request:', {
      email: validatedData.email,
      exactMatch: validatedData.exactMatch,
      includeInactive: validatedData.includeInactive,
      clientId
    })

    // Perform the lookup
    const result = await EmployeeLookupService.searchByEmail(
      validatedData.email,
      {
        exactMatch: validatedData.exactMatch,
        includeInactive: validatedData.includeInactive,
        timeout: EXTERNAL_DB_CONFIG.REQUEST_TIMEOUT_MS
      }
    )

    const duration = Date.now() - startTime
    console.log(`Employee lookup completed in ${duration}ms`, {
      found: result.found,
      email: validatedData.email
    })

    if (result.error) {
      return NextResponse.json(
        createLookupResponse(false, undefined, result.error),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createLookupResponse(result.found, result.data),
      { status: 200 }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`Employee lookup failed after ${duration}ms:`, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createLookupResponse(false, undefined, 'Invalid request parameters'),
        { status: 400 }
      )
    }

    if (error instanceof ExternalEmployeeLookupError) {
      const statusCode = getStatusCodeForError(error.code)
      return NextResponse.json(
        createLookupResponse(false, undefined, error.message),
        { status: statusCode }
      )
    }

    return NextResponse.json(
      createLookupResponse(false, undefined, 'Internal server error'),
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees/lookup
 * Search employees by email pattern
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check rate limiting
    const clientId = getClientId(request)
    if (!checkRateLimit(clientId, 5)) { // Lower limit for search
      return NextResponse.json(
        createSearchResponse([], '', 'Rate limit exceeded'),
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Validate request data
    const validatedData = EmployeeSearchRequestSchema.parse(body)

    console.log('Employee search request:', {
      pattern: validatedData.emailPattern,
      limit: validatedData.limit,
      clientId
    })

    // Perform the search
    const results = await EmployeeLookupService.searchByEmailPattern(
      validatedData.emailPattern,
      validatedData.limit
    )

    const processedResults = results
      .filter(result => result.found && result.data)
      .map(result => result.data!)

    const duration = Date.now() - startTime
    console.log(`Employee search completed in ${duration}ms`, {
      pattern: validatedData.emailPattern,
      resultsCount: processedResults.length
    })

    return NextResponse.json(
      createSearchResponse(processedResults, validatedData.emailPattern),
      { status: 200 }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`Employee search failed after ${duration}ms:`, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createSearchResponse([], '', 'Invalid request parameters'),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createSearchResponse([], '', 'Internal server error'),
      { status: 500 }
    )
  }
}

/**
 * GET /api/employees/lookup/test
 * Test database connectivity
 */
export async function HEAD(request: NextRequest) {
  try {
    const result = await EmployeeLookupService.testConnection()
    
    if (result.success) {
      return new NextResponse(null, { 
        status: 200,
        headers: { 'X-DB-Status': 'connected' }
      })
    } else {
      return new NextResponse(null, { 
        status: 503,
        headers: { 'X-DB-Status': 'disconnected' }
      })
    }
  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: { 'X-DB-Status': 'error' }
    })
  }
}

// Helper functions

function getClientId(request: NextRequest): string {
  // In production, you might want to use a more sophisticated approach
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 
            request.headers.get('x-real-ip') || 
            'unknown'
  return ip.trim()
}

function checkRateLimit(clientId: string, maxRequests: number = 10): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  
  const clientData = rateLimitStore.get(clientId)
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }
  
  if (clientData.count >= maxRequests) {
    return false
  }
  
  clientData.count++
  return true
}

function getStatusCodeForError(errorCode: string): number {
  switch (errorCode) {
    case LOOKUP_ERROR_CODES.INVALID_EMAIL:
    case LOOKUP_ERROR_CODES.VALIDATION_FAILED:
      return 400
    case LOOKUP_ERROR_CODES.NOT_FOUND:
      return 404
    case LOOKUP_ERROR_CODES.RATE_LIMITED:
      return 429
    case LOOKUP_ERROR_CODES.TIMEOUT:
      return 408
    case LOOKUP_ERROR_CODES.CONNECTION_FAILED:
    case LOOKUP_ERROR_CODES.DATABASE_ERROR:
    default:
      return 500
  }
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [clientId, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(clientId)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes