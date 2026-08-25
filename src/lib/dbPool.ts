import { Pool, type PoolConfig } from 'pg'
import { logger } from './logger'
import { schema } from './schema'
import rdsCaBundle from './rds-global-bundle.pem'

interface DatabaseSecret {
  username: string;
  password: string;
}

let pool: Pool | undefined

async function getCredentials(): Promise<DatabaseSecret> {
  const secretArn = process.env.DB_SECRET_ARN

  if (!secretArn) {
    throw new Error('DB_SECRET_ARN is not configured')
  }

  const response = await fetch(
    'http://localhost:2773/secretsmanager/get' +
      `?secretId=${encodeURIComponent(secretArn)}`,
    {
      headers: {
        'X-Aws-Parameters-Secrets-Token':
              process.env.AWS_SESSION_TOKEN ?? ''
      }
    }
  )

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve database credentials: ${response.status}`
    )
  }

  const responseBody = await response.json() as {
    SecretString: string;
  }

  return JSON.parse(
    responseBody.SecretString
  ) as DatabaseSecret
}

export async function getPool(): Promise<Pool> {
  if (pool) {
    return pool
  }

  const credentials = await getCredentials()

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
      ca: rdsCaBundle,
      rejectUnauthorized: true
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
