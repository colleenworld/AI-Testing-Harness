import {
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals'
import { Context } from 'aws-lambda'
import { GoogleGenAI } from '@google/genai'
import { handler } from '../stages/judge'
import { safeQuery } from '../lib/dbPool'
import { JudgeEvent } from '../lib/types'

const mockGenerateContent = jest.fn<
  (request: unknown) => Promise<{ text: string }>
>()

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn()
}))

jest.mock('../lib/dbPool', () => ({
  __esModule: true,
  safeQuery: jest.fn(),
  initializeDatabaseSchema: jest.fn()
}))

const MockedGoogleGenAI =
  GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>

const mockedSafeQuery =
  jest.mocked(safeQuery)

describe('⚖️ Production LLM-as-a-Judge Handler Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    process.env.GEMINI_API_KEY = 'test-gemini-key'

    mockGenerateContent.mockImplementation(
      async (_request: unknown): Promise<{ text: string }> => ({
        text: JSON.stringify({
          factuality: 5,
          citation: 4,
          formatting: 3
        })
      })
    )

    MockedGoogleGenAI.mockImplementation((() => ({
      models: {
        generateContent: mockGenerateContent
      }
    })) as any)

    mockedSafeQuery.mockResolvedValue({
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      rows: [],
      fields: []
    })
  })

  it('processes and saves valid judge scores', async () => {
    const event: JudgeEvent = {
      execution_id: 'test-execution-123',
      results: [
        {
          task_id: 'task_1_01',
          category: 'Testing',
          model_name: 'test-model',
          prompt: 'Test prompt',
          raw_output: 'Test model output',
          ground_truth: 'Expected answer',
          latency_ms: 100
        }
      ]
    }

    const result = await handler(
      event,
      {} as Context,
      jest.fn()
    )

    expect(result).toEqual({
      execution_id: 'test-execution-123',
      status: 'SUCCESS',
      count: 1
    })

    expect(MockedGoogleGenAI).toHaveBeenCalledTimes(1)

    expect(MockedGoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'test-gemini-key'
    })

    expect(mockGenerateContent).toHaveBeenCalledTimes(1)

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-pro',
        config: {
          responseMimeType: 'application/json'
        }
      })
    )

    expect(mockedSafeQuery).toHaveBeenCalledTimes(1)

    expect(mockedSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO evaluation_runs'
      ),
      [
        'test-execution-123',
        'task_1_01',
        'Testing',
        'test-model',
        'Test prompt',
        'Test model output',
        'Expected answer',
        5,
        4,
        3,
        100
      ]
    )
  })
})