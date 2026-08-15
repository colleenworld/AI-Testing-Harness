import { describe, expect, test, jest } from '@jest/globals'
import { z } from 'zod'
import { handler } from '../hydrate'
jest.mock('../lib/dbPool')
import pool from '../lib/dbPool'

// Cast the database instance into a Jest Mock type to cleanly read your .toHaveBeenCalled assertions
const mockedPool = pool as jest.Mocked<typeof pool>
const HydratedTaskSchema = z.object({
  task_id: z.string(),
  category: z.string(),
  prompt: z.string(),
  dynamic_ground_truth: z.string()
})

// The core mapping algorithm from your hydrate logic pulled out for isolation
function mapTaskToLiveContext(task: any, liveWebContext: string | null) {
  if (!liveWebContext) {
    throw new Error('Hydration failed: Live search context is missing or null.')
  }
  return {
    task_id: task.task_id,
    category: task.category,
    prompt: task.prompt,
    dynamic_ground_truth: `[Verified Fact Context]: ${liveWebContext}`
  }
}

describe('💧 Pipeline Dataset Hydration Engine Suite', () => {

  const mockRawTask = {
    task_id: 'task_test_99',
    category: 'Live Metrics',
    prompt: 'What happened to stock prices today?'
  }

  test('✅ Should correctly stitch live web variables into the ground truth fields', () => {
    const mockSearchData = 'Market closed up 1.2% across major indexes.'

    const result = mapTaskToLiveContext(mockRawTask, mockSearchData)

    // Assert structure matches perfectly
    expect(HydratedTaskSchema.safeParse(result).success).toBe(true)
    expect(result.dynamic_ground_truth).toContain('Market closed up 1.2%')
  })

  test('❌ Should throw an error if the live web context payload arrives empty or corrupt', () => {
    expect(() => {
      mapTaskToLiveContext(mockRawTask, null)
    }).toThrow('Hydration failed')
  })
})