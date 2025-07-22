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
  ssl?: mysql.SslOptions | undefined
  charset: string
  timezone: string
}

interface ConnectionStatus {
  isConnected: boolean
  activeConnections?: number
  error?: string
  lastChecked: string
}

class ExternalDatabaseService {
  private static instance: ExternalDatabaseService
  private pool: mysql.Pool | null = null
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

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

    // Properly handle SSL configuration based on environment
    let sslConfig: mysql.SslOptions | undefined
    
    if (process.env.EXTERNAL_DB_SSL === 'true') {
      sslConfig = {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    }
    // If EXTERNAL_DB_SSL is 'false' or undefined, sslConfig remains undefined (no SSL)

    return {
      host: process.env.EXTERNAL_DB_HOST!,
      user: process.env.EXTERNAL_DB_USER!,
      password: process.env.EXTERNAL_DB_PASSWORD!,
      database: process.env.EXTERNAL_DB_NAME!,
      port: parseInt(process.env.EXTERNAL_DB_PORT || '3306'),
      connectionLimit: parseInt(process.env.EXTERNAL_DB_CONNECTION_LIMIT || '10'),
      acquireTimeout: parseInt(process.env.EXTERNAL_DB_ACQUIRE_TIMEOUT || '30000'),
      timeout: parseInt(process.env.EXTERNAL_DB_TIMEOUT || '30000'),
      reconnect: true,
      ssl: sslConfig,
      charset: 'utf8mb4',
      timezone: '+00:00'
    }
  }

  async initialize(): Promise<void> {
    // Prevent multiple concurrent initializations
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    if (this.isInitialized && this.pool) {
      return Promise.resolve()
    }

    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  private async performInitialization(): Promise<void> {
    try {
      const config = this.getConfig()
      
      console.log('Initializing external database connection pool...', {
        host: config.host,
        database: config.database,
        port: config.port,
        ssl: config.ssl ? 'enabled' : 'disabled',
        connectionLimit: config.connectionLimit
      })

      this.pool = mysql.createPool(config)

      // Test the connection
      await this.testConnection()
      this.isInitialized = true
      this.initializationPromise = null
      
      console.log('External database connection pool initialized successfully')
    } catch (error) {
      this.initializationPromise = null
      console.error('Failed to initialize external database:', error)
      throw new Error(`External database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized')
    }

    let connection: mysql.PoolConnection | null = null
    try {
      connection = await this.pool.getConnection()
      await connection.ping()
      console.log('External database connection test successful')
    } catch (error) {
      console.error('Database connection test failed:', error)
      throw new Error(`Database connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (connection) {
        connection.release()
      }
    }
  }

  async executeQuery<T = any>(
    sql: string, 
    params: any[] = [],
    options?: { timeout?: number }
  ): Promise<T[]> {
    if (!this.pool) {
      await this.initialize()
    }

    if (!this.pool) {
      throw new Error('Database connection not available')
    }

    const startTime = Date.now()
    let connection: mysql.PoolConnection | null = null

    try {
      console.log('Executing external DB query:', { 
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''), 
        paramCount: params.length,
        timeout: options?.timeout
      })

      connection = await this.pool.getConnection()
      
      if (options?.timeout) {
        // Set query timeout if specified
        await connection.query('SET SESSION max_execution_time = ?', [options.timeout])
      }

      const [rows] = await connection.execute(sql, params)
      
      const duration = Date.now() - startTime
      console.log(`External DB query completed in ${duration}ms`)
      
      return rows as T[]
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('External database query failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        duration,
        paramCount: params.length
      })
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Database connection refused - check host and port')
        } else if (error.message.includes('ER_ACCESS_DENIED')) {
          throw new Error('Database access denied - check credentials')
        } else if (error.message.includes('ETIMEDOUT')) {
          throw new Error('Database query timeout - query took too long')
        }
      }
      
      throw new Error(`Database query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (connection) {
        connection.release()
      }
    }
  }

  async executeQuerySingle<T = any>(
    sql: string, 
    params: any[] = [],
    options?: { timeout?: number }
  ): Promise<T | null> {
    const results = await this.executeQuery<T>(sql, params, options)
    return results.length > 0 ? results[0] : null
  }

  async executeTransaction<T>(
    operations: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      await this.initialize()
    }

    if (!this.pool) {
      throw new Error('Database connection not available')
    }

    let connection: mysql.PoolConnection | null = null
    
    try {
      connection = await this.pool.getConnection()
      await connection.beginTransaction()
      
      const result = await operations(connection)
      
      await connection.commit()
      return result
    } catch (error) {
      if (connection) {
        await connection.rollback()
      }
      console.error('Transaction failed:', error)
      throw error
    } finally {
      if (connection) {
        connection.release()
      }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      console.log('Closing external database connection pool...')
      await this.pool.end()
      this.pool = null
      this.isInitialized = false
      this.initializationPromise = null
      console.log('External database connection pool closed')
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const timestamp = new Date().toISOString()
    
    try {
      if (!this.pool) {
        return { 
          isConnected: false, 
          error: 'Pool not initialized',
          lastChecked: timestamp
        }
      }

      await this.testConnection()
      
      // Get pool statistics if available
      const poolStats = (this.pool as any)?._allConnections?.length || 0
      
      return {
        isConnected: true,
        activeConnections: poolStats,
        lastChecked: timestamp
      }
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: timestamp
      }
    }
  }

  // Health check method for monitoring
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    details: {
      database: string
      isConnected: boolean
      responseTime?: number
      error?: string
    }
  }> {
    const startTime = Date.now()
    
    try {
      const status = await this.getConnectionStatus()
      const responseTime = Date.now() - startTime
      
      return {
        status: status.isConnected ? 'healthy' : 'unhealthy',
        details: {
          database: 'external_mysql',
          isConnected: status.isConnected,
          responseTime,
          error: status.error
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      return {
        status: 'unhealthy',
        details: {
          database: 'external_mysql',
          isConnected: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  // Utility method to check if service is ready
  isReady(): boolean {
    return this.isInitialized && this.pool !== null
  }
}

// Export singleton instance
export const externalDb = ExternalDatabaseService.getInstance()

// Graceful shutdown handling for Vercel and other environments
if (typeof process !== 'undefined') {
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, closing external database connections...`)
    try {
      await externalDb.close()
      console.log('External database connections closed successfully')
    } catch (error) {
      console.error('Error closing external database connections:', error)
    }
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  
  // Vercel-specific cleanup
  process.on('beforeExit', () => gracefulShutdown('beforeExit'))
}

// Export type for use in other services
export type { ConnectionStatus }