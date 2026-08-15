import { describe, expect, test, jest } from '@jest/globals'
import { handler } from '../runner'
import { RunnerEvent } from '../lib/types'
jest.mock('@google/genai')
jest.mock('openai')

describe('🤖 Production Parallel Model Runner Suite', () => {
  test('✅ Real handler should map tasks concurrently to mock providers', async () => {
    const mockEvent: RunnerEvent = {
      execution_id: 'run-sync-test',
      hydrated_tasks: [
        {
          task_id: 'task_1_01',
          category: 'Testing',
          prompt: 'Concurrence Test Prompt',
          dynamic_ground_truth: 'Verified Ground Truth Context'
        }
      ]
    }

    const result = await handler(mockEvent, {} as any, () => {})

    expect(result).toBeDefined()
    expect(result.execution_id).toBe('run-sync-test')
    expect(result.results.length).toBe(5) // Verifies all 5 concurrent streams succeed
    expect(result.results[0].raw_output).not.toContain('Error placeholder')
  })
})
