// lib/services/externalDbService.ts
import mysql from 'mysql2/promise'

interface DatabaseConfig {
  host: string
  user: string
  password: string
  database: string
  port: number
  connectionLimit: number
  acquireTimeout: number
  timeout: number
  reconnect: boolean
}

class ExternalDatabaseService {
  private static instance: ExternalDatabaseService
  private pool: mysql.Pool | null = null
  private isInitialized = false

  private constructor() {}

  static getInstance(): ExternalDatabaseService {
    if (!ExternalDatabaseService.instance) {
      ExternalDatabaseService.instance = new ExternalDatabaseService()
    }
    return ExternalDatabaseService.instance
  }

  private getConfig(): DatabaseConfig {
    const requiredEnvVars = [
      'EXTERNAL_DB_HOST',
      'EXTERNAL_DB_USER', 
      'EXTERNAL_DB_PASSWORD',
      'EXTERNAL_DB_NAME'
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    return {
      host: process.env.EXTERNAL_DB_HOST!,
      user: process.env.EXTERNAL_DB_USER!,
      password: process.env.EXTERNAL_DB_PASSWORD!,
      database: process.env.EXTERNAL_DB_NAME!,
      port: parseInt(process.env.EXTERNAL_DB_PORT || '3306'),
      connectionLimit: 10,
      acquireTimeout: 30000,
      timeout: 30000,
      reconnect: true
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized && this.pool) {
      return
    }

    try {
      const config = this.getConfig()
      
      this.pool = mysql.createPool({
        ...config,
        ssl: process.env.EXTERNAL_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        charset: 'utf8mb4',
        timezone: '+00:00'
      })

      // Test the connection
      await this.testConnection()
      this.isInitialized = true
      
      console.log('External database connection pool initialized successfully')
    } catch (error) {
      console.error('Failed to initialize external database:', error)
      throw new Error('External database initialization failed')
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized')
    }

    try {
      const connection = await this.pool.getConnection()
      await connection.ping()
      connection.release()
    } catch (error) {
      console.error('Database connection test failed:', error)
      throw error
    }
  }

  async executeQuery<T = any>(
    sql: string, 
    params: any[] = []
  ): Promise<T[]> {
    if (!this.pool) {
      await this.initialize()
    }

    if (!this.pool) {
      throw new Error('Database connection not available')
    }

    try {
      console.log('Executing external DB query:', { 
        sql: sql.substring(0, 100) + '...', 
        paramCount: params.length 
      })

      const [rows] = await this.pool.execute(sql, params)
      return rows as T[]
    } catch (error) {
      console.error('External database query failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sql: sql.substring(0, 100) + '...'
      })
      throw new Error('Database query execution failed')
    }
  }

  async executeQuerySingle<T = any>(
    sql: string, 
    params: any[] = []
  ): Promise<T | null> {
    const results = await this.executeQuery<T>(sql, params)
    return results.length > 0 ? results[0] : null
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      this.isInitialized = false
      console.log('External database connection pool closed')
    }
  }

  async getConnectionStatus(): Promise<{
    isConnected: boolean
    activeConnections?: number
    error?: string
  }> {
    try {
      if (!this.pool) {
        return { isConnected: false, error: 'Pool not initialized' }
      }

      await this.testConnection()
      
      return {
        isConnected: true,
        activeConnections: (this.pool as any)?.pool?.allConnections?.length || 0
      }
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Export singleton instance
export const externalDb = ExternalDatabaseService.getInstance()

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('Closing external database connections...')
    await externalDb.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Closing external database connections...')
    await externalDb.close()
    process.exit(0)
  })
}