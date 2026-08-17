import { Pool } from 'pg'
import { logger } from './logger'
import { schema } from './schema'

const poolSettings = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 1,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000
}

const pool = new Pool(poolSettings)

let isSchemaInitialized = false

export async function initializeDatabaseSchema() {
  logger.info('Checking and initializing PostgreSQL database tables...')
  try {
    await safeQuery(schema)
    logger.info('Database schema migration baseline verified successfully.')
  }
  catch (error: any) {
    logger.error('Failed to initialize database schema migrating scripts:', { error: error.message })
    throw error
  }
}

export async function safeQuery(text: string, params?: any[]) {
  if (!isSchemaInitialized && process.env.NODE_ENV !== 'test') {
    try {
      logger.info('Checking and initializing PostgreSQL database tables...')
      await pool.query(schema)
      isSchemaInitialized = true
      logger.info('PostgreSQL schema verification completed successfully.')
    }
    catch (error: any) {
      logger.error('Failed to initialize database schema migrating scripts:', { error: error.message })
      throw error
    }
  }

  return pool.query(text, params)
}

export default pool
