import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { handler } from '../apiHandler'
import { APIGatewayProxyEvent } from 'aws-lambda'
import mockDbPool from '../lib/__mocks__/dbPool'

// Bind environmental credential variables before triggering execution suites
const VALID_TOKEN = 'secret-auth-token-123'
process.env.EXPECTED_API_KEY = VALID_TOKEN

describe('🧪 ApiHandler Security Validation Suites', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should reject requests with a 401 status if the X-Api-Key header is missing', async () => {
    const dummyEvent = {
      headers: {},
      queryStringParameters: { category: 'All' }
    } as unknown as APIGatewayProxyEvent

    const result = await handler(dummyEvent)

    expect(result.statusCode).toBe(401)
    expect(JSON.parse(result.body).error).toContain('Unauthorized')
    expect(mockDbPool.safeQuery).not.toHaveBeenCalled()
  })

  it('should reject requests with a 401 status if the X-Api-Key is incorrect', async () => {
    const dummyEvent = {
      headers: { 'X-Api-Key': 'malicious-invalid-token' },
      queryStringParameters: { category: 'All' }
    } as unknown as APIGatewayProxyEvent

    const result = await handler(dummyEvent)

    expect(result.statusCode).toBe(401)
    expect(mockDbPool.safeQuery).not.toHaveBeenCalled()
  })

  it('should pass validation and return database rows when a valid X-Api-Key header is provided', async () => {
    const mockRows = [ { id: 1, task_id: 'task_01', category: 'Safety', prompt: 'Test' } ];
    // @ts-ignore
    (mockDbPool.safeQuery as jest.Mock).mockResolvedValueOnce({ rows: mockRows })

    const dummyEvent = {
      headers: { 'x-api-key': VALID_TOKEN }, // Testing lower-case key fallback properties
      queryStringParameters: { category: 'Safety' }
    } as unknown as APIGatewayProxyEvent

    const result = await handler(dummyEvent)

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual(mockRows)
    expect(mockDbPool.safeQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE category = $1'),
      [ 'Safety' ]
    )
  })
})