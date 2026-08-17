import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { safeQuery, initializeDatabaseSchema } from './lib/dbPool' // ◄ Import the schema initializer
import { logger } from './lib/logger'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  logger.info('Received API Gateway query event profile context')

  try {
    // FIXED: Run cold-start migration check before attempting any SELECT statements
    await initializeDatabaseSchema()

    const category = event.queryStringParameters?.category || 'All'
    let queryText = `
      SELECT id, task_id, category, prompt, raw_output, ground_truth,
             latency_ms, model_version, prompt_tokens, completion_tokens,
             total_tokens, calculated_cost_usd, parsed_metrics
      FROM evaluation_results
    `
    const params: any[] = []

    if (category !== 'All') {
      queryText += ' WHERE category = $1'
      params.push(category)
    }

    queryText += ' ORDER BY created_at DESC LIMIT 100'

    const dbResult = await safeQuery(queryText, params)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:3000'
      },
      body: JSON.stringify(dbResult.rows)
    }
  }
  catch (error: any) {
    logger.error('API Handler failed to extract evaluation records:', { error: error.message })
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'http://localhost:3000' },
      body: JSON.stringify({ error: 'Internal Database Retrieval Failure' })
    }
  }
}
