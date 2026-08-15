import { describe, expect, test, jest } from '@jest/globals'
import { handler } from '../judge'
import { JudgeEvent } from '../lib/types'
jest.mock('@google/genai')
jest.mock('../lib/dbPool')
import pool from '../lib/dbPool'
const mockedPool = pool as jest.Mocked<typeof pool>

describe('⚖️ Production LLM-as-a-Judge Handler Suite', () => {
  test('✅ Real handler should process a clean data package successfully', async () => {
    const mockEvent: JudgeEvent = {
      execution_id: 'test-execution-123',
      results: [
        {
          model_name: 'test-model',
          task_id: 'task_1_01',
          category: 'Temporal',
          prompt: 'What happened today?',
          raw_output: 'Sample text model response payload structure',
          ground_truth: 'Verified Context',
          latency_ms: 150
        }
      ]
    }

    const result = await handler(mockEvent, {} as any, () => {})

    expect(result).toBeDefined()
    expect(result.status).toBe('SUCCESS')
    expect(mockedPool.query).toHaveBeenCalled()
  })
})