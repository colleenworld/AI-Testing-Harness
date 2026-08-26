import {
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'
import { Context } from 'aws-lambda'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { handler } from '../stages/runner'
import {
  RunnerEvent,
  RunnerResult
} from '../lib/types'
import { safeQuery } from '../lib/dbPool'
import { ModelOutput } from '../lib/class/ModelOutput'

const mockGenerateContent = jest.fn(
  async () => ({
    text: 'Mock direct Gemini response'
  })
)

const mockOpenRouterCreate = jest.fn(
  async () => ({
    choices: [
      {
        message: {
          content: 'Mock OpenRouter response'
        }
      }
    ]
  })
)

jest.mock('../lib/dbPool', () => ({
  __esModule: true,
  safeQuery: jest.fn(),
  initializeDatabaseSchema: jest.fn()
}))

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn()
}))

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn()
}))

const mockedSafeQuery =
  safeQuery as jest.MockedFunction<typeof safeQuery>

const MockedGoogleGenAI =
  GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>

const MockedOpenAI =
  OpenAI as jest.MockedClass<typeof OpenAI>

describe('🤖 Production Parallel Model Runner Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    process.env.GEMINI_API_KEY = 'test-gemini-key'
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'

    mockGenerateContent.mockImplementation(async () => ({
      text: 'Mock direct Gemini response'
    }))

    mockOpenRouterCreate.mockImplementation(async () => ({
      choices: [
        {
          message: {
            content: 'Mock OpenRouter response'
          }
        }
      ]
    }))

    MockedGoogleGenAI.mockImplementation((() => ({
      models: {
        generateContent: mockGenerateContent
      }
    })) as any)

    MockedOpenAI.mockImplementation((() => ({
      chat: {
        completions: {
          create: mockOpenRouterCreate
        }
      }
    })) as any)

    mockedSafeQuery.mockResolvedValue({
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [
        {
          task_id: 'task_1_01',
          category: 'Testing',
          prompt: 'Concurrency Test Prompt',
          dynamic_ground_truth: 'Verified Ground Truth Context'
        }
      ]
    })
  })

  test('maps database tasks to all configured model providers', async () => {
    const event: RunnerEvent = {
      execution_id: 'run-sync-test'
    }

    const result = await handler(
      event,
      {} as Context,
      jest.fn()
    ) as RunnerResult

    expect(result.execution_id).toBe('run-sync-test')
    expect(result.attempted).toBe(5)
    expect(result.completed).toBe(5)
    expect(result.results).toHaveLength(5)

    expect(mockedSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM golden_tasks')
    )

    expect(MockedGoogleGenAI).toHaveBeenCalledTimes(1)
    expect(MockedGoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'test-gemini-key'
    })

    expect(MockedOpenAI).toHaveBeenCalledTimes(1)
    expect(MockedOpenAI).toHaveBeenCalledWith({
      apiKey: 'test-openrouter-key',
      baseURL: 'https://openrouter.ai/api/v1'
    })

    expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    expect(mockOpenRouterCreate).toHaveBeenCalledTimes(4)

    const outputs = result.results.map(
      (item: ModelOutput) => item.raw_output
    )

    expect(outputs).toHaveLength(5)

    expect(
      outputs.filter(
        output => output === 'Mock direct Gemini response'
      )
    ).toHaveLength(1)

    expect(
      outputs.filter(
        output => output === 'Mock OpenRouter response'
      )
    ).toHaveLength(4)

    expect(
      outputs.some(output => output.includes('Error:'))
    ).toBe(false)
  })
})