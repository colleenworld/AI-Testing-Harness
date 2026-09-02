import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda'
import { safeQuery } from './lib/dbPool'
import { logger } from './lib/logger'

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  logger.info(
    'Received API Gateway query event profile context'
  )

  const corsOrigin = resolveCorsOrigin(event)

  if (event.httpMethod === 'OPTIONS') {
    return emptyResponse(204, corsOrigin)
  }

  try {
    const category =
      event.queryStringParameters?.category ?? 'All'

    let queryText = `
      SELECT
        id,
        execution_id,
        task_id,
        category,
        prompt,
        raw_output,
        ground_truth,
        latency_ms,
        model_version,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        calculated_cost_usd,
        parsed_metrics,
        created_at
      FROM evaluation_results
    `

    const params: unknown[] = []

    if (category !== 'All') {
      queryText += ' WHERE category = $1'
      params.push(category)
    }

    queryText += `
      ORDER BY created_at ASC
      LIMIT 200
    `

    const dbResult = await safeQuery(
      queryText,
      params
    )

    return jsonResponse(
      200,
      dbResult.rows,
      corsOrigin
    )
  }
  catch (error: unknown) {
    logger.error(
      'API Handler failed to extract evaluation records',
      {
        error: getErrorMessage(error)
      }
    )

    return jsonResponse(
      500,
      {
        error: 'Internal Database Retrieval Failure'
      },
      corsOrigin
    )
  }
}

function resolveCorsOrigin(
  event: APIGatewayProxyEvent
): string {
  const configuredOrigins =
    process.env.FRONTEND_ORIGIN ??
      'http://localhost:3000'

  const allowedOrigins = configuredOrigins
    .split(',')
    .map(origin =>
      origin
        .trim()
        .replace(/^['"]|['"]$/g, '')
    )
    .filter(Boolean)

  const requestOrigin =
    event.headers.origin ??
      event.headers.Origin

  if ( requestOrigin && allowedOrigins.includes('*'))
    return '*'

  if (
    requestOrigin &&
      allowedOrigins.includes(requestOrigin)
  ) {
    return requestOrigin
  }

  return allowedOrigins[0] ??
      'http://localhost:3000'
}

function corsHeaders(
  origin: string
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
        'Content-Type,X-Api-Key',
    'Access-Control-Allow-Methods':
        'GET,OPTIONS',
    Vary: 'Origin'
  }
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  origin: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body)
  }
}

function emptyResponse(
  statusCode: number,
  origin: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: ''
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error)
}