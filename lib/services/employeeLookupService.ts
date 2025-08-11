// lib/services/employeeLookupService.ts
// Updated to use HTTP bridge instead of direct database connection
import { z } from 'zod'

// Validation schemas
const EmailSearchSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email too long')
    .refine(
      (email) => email.includes('@'),
      'Email must contain @ symbol'
    )
})

const ExternalEmployeeSchema = z.object({
  id: z.number(), // Add customer ID for employee_code
  email: z.string().email(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  job_name: z.string().nullable()
})

// Types
export interface ExternalEmployeeData {
  id: number // Add customer ID
  email: string
  firstname: string | null
  lastname: string | null
  job_name: string | null
}

export interface EmployeeLookupResult {
  found: boolean
  data?: {
    customerId: number // Add customer ID
    email: string
    fullName: string
    position: string // This will be the exact job_name
    originalJobName: string // Keep original for reference
  }
  error?: string
  source: 'external_db'
}

export interface EmployeeLookupOptions {
  exactMatch?: boolean
  includeInactive?: boolean
  timeout?: number
}

/**
 * HTTP Database Bridge Client
 * Replaces direct database connection with HTTP calls to your bridge
 */
class HTTPDatabaseBridge {
  private bridgeUrl: string;

  constructor() {
    this.bridgeUrl = process.env.DB_BRIDGE_URL || '';
    if (!this.bridgeUrl) {
      throw new Error('DB_BRIDGE_URL environment variable is required');
    }
    
    // Ensure URL doesn't end with slash
    this.bridgeUrl = this.bridgeUrl.replace(/\/$/, '');
  }

  /**
   * Execute a single query and return first result
   */
  async executeQuerySingle<T>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const response = await fetch(`${this.bridgeUrl}/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-App/1.0'
        },
        body: JSON.stringify({ sql, params }),
        // Add timeout for Vercel serverless functions
        signal: AbortSignal.timeout(25000) // 25 seconds
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Database query failed');
      }

      // Return first result or null
      return result.data && result.data.length > 0 ? result.data[0] : null;
      
    } catch (error) {
      console.error('Database query failed:', { 
        sql, 
        params, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Execute query and return all results
   */
  async executeQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const response = await fetch(`${this.bridgeUrl}/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-App/1.0'
        },
        body: JSON.stringify({ sql, params }),
        signal: AbortSignal.timeout(25000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Database query failed');
      }

      return result.data || [];
      
    } catch (error) {
      console.error('Database query failed:', { 
        sql, 
        params, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Test connection to database bridge
   */
  async getConnectionStatus(): Promise<{ isConnected: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.bridgeUrl}/test`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 seconds for health check
      });

      if (!response.ok) {
        return {
          isConnected: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = await response.json();
      
      return {
        isConnected: result.success === true,
        error: result.success ? undefined : result.error
      };
      
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Create instance of HTTP bridge (replaces externalDb)
const httpBridge = new HTTPDatabaseBridge();

/**
 * Service for looking up employee data from external Lensa Shop database
 * Now uses HTTP bridge instead of direct database connection
 */
export class EmployeeLookupService {
  
  /**
   * Search for employee by email address
   */
  static async searchByEmail(
    email: string, 
    options: EmployeeLookupOptions = {}
  ): Promise<EmployeeLookupResult> {
    try {
      // Validate input
      const validatedEmail = EmailSearchSchema.parse({ email }).email
      
      // Sanitize email for search
      const sanitizedEmail = this.sanitizeEmailForSearch(validatedEmail)
      
      console.log('Looking up employee:', { 
        email: sanitizedEmail,
        options 
      })

      // Execute the lookup query via HTTP bridge
      const employee = await this.executeEmployeeLookup(sanitizedEmail, options)
      
      if (!employee) {
        return {
          found: false,
          source: 'external_db'
        }
      }

      // Transform external data to internal format
      const transformedData = this.transformEmployeeData(employee)
      
      return {
        found: true,
        data: transformedData,
        source: 'external_db'
      }

    } catch (error) {
      console.error('Employee lookup failed:', error)
      
      return {
        found: false,
        error: error instanceof Error ? error.message : 'Lookup failed',
        source: 'external_db'
      }
    }
  }

  /**
   * Search for multiple employees by email pattern
   */
  static async searchByEmailPattern(
    emailPattern: string,
    limit: number = 10
  ): Promise<EmployeeLookupResult[]> {
    try {
      const sanitizedPattern = this.sanitizeEmailForSearch(emailPattern)
      
      if (sanitizedPattern.length < 3) {
        throw new Error('Search pattern must be at least 3 characters')
      }

      const employees = await this.executeEmployeeSearch(sanitizedPattern, limit)
      
      return employees.map(employee => ({
        found: true,
        data: this.transformEmployeeData(employee),
        source: 'external_db' as const
      }))

    } catch (error) {
      console.error('Employee pattern search failed:', error)
      return []
    }
  }

  /**
   * Execute the main employee lookup query via HTTP bridge
   */
  private static async executeEmployeeLookup(
    email: string,
    options: EmployeeLookupOptions
  ): Promise<ExternalEmployeeData | null> {
    
    // Build the SQL query with proper parameterization - INCLUDE ID!
    const sql = `
      SELECT 
        c.id,
        c.email,
        c.firstname, 
        c.lastname,
        e.job_name
      FROM lensa_shop.customers c
      LEFT JOIN lensa_shop.employees e ON c.id = e.customer_id
      WHERE c.email = ?
        AND c.email NOT REGEXP '[0-9]{10,}'
        ${!options.includeInactive ? 'AND (e.active = 1 OR e.active IS NULL)' : ''}
      LIMIT 1
    `

    const result = await httpBridge.executeQuerySingle<ExternalEmployeeData>(
      sql, 
      [email]
    )

    if (result) {
      // Validate the result structure
      return ExternalEmployeeSchema.parse(result)
    }

    return null
  }

  /**
   * Execute employee search by pattern via HTTP bridge
   */
  private static async executeEmployeeSearch(
    emailPattern: string,
    limit: number
  ): Promise<ExternalEmployeeData[]> {
    
    const sql = `
      SELECT 
        c.id,
        c.email,
        c.firstname, 
        c.lastname,
        e.job_name
      FROM lensa_shop.customers c
      LEFT JOIN lensa_shop.employees e ON c.id = e.customer_id
      WHERE c.email LIKE CONCAT('%', ?, '%')
        AND c.email LIKE '%@lensa%'
        AND c.email NOT REGEXP '[0-9]{10,}'
        AND (e.active = 1 OR e.active IS NULL)
      ORDER BY c.email
      LIMIT ?
    `

    const results = await httpBridge.executeQuery<ExternalEmployeeData>(
      sql, 
      [emailPattern, limit]
    )

    return results.map(result => ExternalEmployeeSchema.parse(result))
  }

  /**
   * Transform external employee data to internal format
   */
  private static transformEmployeeData(
    employee: ExternalEmployeeData
  ): { customerId: number; email: string; fullName: string; position: string; originalJobName: string } {
    
    const firstName = employee.firstname?.trim() || ''
    const lastName = employee.lastname?.trim() || ''
    
    // Build full name with proper spacing
    const fullName = [firstName, lastName]
      .filter(part => part.length > 0)
      .join(' ') || 'Unknown Employee'
    
    // Use the exact job_name as position regardless of what it is
    const originalJobName = employee.job_name?.trim() || 'Staff'
    const position = originalJobName // Use exact job_name without any mapping
    
    return {
      customerId: employee.id, // Include customer ID for employee_code
      email: employee.email,
      fullName,
      position, // Exact job_name from database
      originalJobName // Keep for reference
    }
  }

  /**
   * Sanitize email input to prevent injection attacks
   */
  private static sanitizeEmailForSearch(email: string): string {
    return email
      .trim()
      .toLowerCase()
      .replace(/[^\w@.-]/g, '') // Only allow word chars, @, ., and -
      .substring(0, 255) // Limit length
  }

  /**
   * Validate email format for Lensa domain
   */
  static isLensaEmail(email: string): boolean {
    try {
      const validatedEmail = EmailSearchSchema.parse({ email }).email
      return validatedEmail.includes('@lensa') && !this.containsNumericPattern(validatedEmail)
    } catch {
      return false
    }
  }

  /**
   * Check if email contains long numeric patterns (as per original query)
   */
  private static containsNumericPattern(email: string): boolean {
    return /[0-9]{10,}/.test(email)
  }

  /**
   * Test database connectivity via HTTP bridge
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const status = await httpBridge.getConnectionStatus()
      return {
        success: status.isConnected,
        error: status.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}