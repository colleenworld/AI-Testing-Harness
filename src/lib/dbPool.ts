import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from './logger'

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 1,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000
})

let isSchemaInitialized = false

export async function safeQuery(text: string, params?: any[]) {
  if (!isSchemaInitialized && process.env.NODE_ENV !== 'test') {
    try {
      logger.info('Checking and initializing PostgreSQL database tables...')
      const schemaPath = path.join(__dirname, 'schema.sql')
      const schemaSql = fs.readFileSync(schemaPath, 'utf8')

      await pool.query(schemaSql)
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
