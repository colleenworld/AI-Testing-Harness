import fs from 'node:fs';
import path from 'node:path';
import { Pool, type PoolConfig } from 'pg'
import { logger } from './logger'
import { schema } from './schema'
const certPath = path.join(__dirname, 'rds-global-bundle.pem');
const rdsCert = fs.readFileSync(certPath, 'utf8');
import { whisper, DatabaseSecret } from './secret'

let pool: Pool | undefined

export async function getPool(): Promise<Pool> {
  if (pool) {
    return pool
  }

  const credentials = await whisper<DatabaseSecret>('DB_SECRET_ARN')

  const poolSettings: PoolConfig = {
    host: process.env.DB_HOST,
    user: credentials.username,
    password: credentials.password,
    database: process.env.DB_NAME,
    port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: true,
      ca: [rdsCert]
    }
  }

  pool = new Pool(poolSettings)

  return pool
}

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
  const pool = await getPool()
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
