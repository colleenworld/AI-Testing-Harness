import {
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals'
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { handler } from '../apiHandler'
import {
  initializeDatabaseSchema,
  safeQuery
} from '../lib/dbPool'

jest.mock('../lib/dbPool', () => ({
  __esModule: true,
  safeQuery: jest.fn(),
  initializeDatabaseSchema: jest.fn()
}))

const mockedSafeQuery =
  jest.mocked(safeQuery)

const mockedInitializeDatabaseSchema =
  jest.mocked(initializeDatabaseSchema)

process.env.FRONTEND_ORIGIN =
  'https://llm-dashboard-dun.vercel.app'

function createEvent(
  category?: string
): APIGatewayProxyEvent {
  return {
    headers: {},
    queryStringParameters: category
      ? { category }
      : null
  } as unknown as APIGatewayProxyEvent
}

function queryResult<T>(rows: T[]) {
  return {
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    rows,
    fields: []
  }
}

describe('🧪 ApiHandler validation suite', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockedInitializeDatabaseSchema.mockResolvedValue(
      undefined
    )
  })

  it('returns database rows without requiring an API key', async () => {
    const mockRows = [
      {
        id: 1,
        task_id: 'task_01',
        category: 'Safety',
        prompt: 'Test'
      }
    ]

    mockedSafeQuery.mockResolvedValueOnce(
      queryResult(mockRows)
    )

    const result = await handler(
      createEvent('Safety')
    )

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual(mockRows)

    expect(
      mockedInitializeDatabaseSchema
    ).toHaveBeenCalledTimes(1)

    expect(mockedSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE category = $1'),
      [ 'Safety' ]
    )
  })

  it('does not require an X-Api-Key header', async () => {
    mockedSafeQuery.mockResolvedValueOnce(
      queryResult([])
    )

    const result = await handler(
      createEvent('All')
    )

    expect(result.statusCode).toBe(200)

    expect(
      mockedInitializeDatabaseSchema
    ).toHaveBeenCalledTimes(1)

    expect(mockedSafeQuery).toHaveBeenCalled()
  })

  it('returns the configured CORS origin', async () => {
    mockedSafeQuery.mockResolvedValueOnce(
      queryResult([])
    )

    const result = await handler(
      createEvent()
    )

    expect(
      result.headers?.['Access-Control-Allow-Origin']
    ).toBe(
      'https://llm-dashboard-dun.vercel.app'
    )

    expect(result.headers?.Vary).toBe('Origin')
  })

  it('returns a 500 response when the database query fails', async () => {
    mockedSafeQuery.mockRejectedValueOnce(
      new Error('Database unavailable')
    )

    const result = await handler(
      createEvent('Safety')
    )

    expect(result.statusCode).toBe(500)

    expect(JSON.parse(result.body)).toEqual(
      expect.objectContaining({
        error: expect.any(String)
      })
    )
  })
})