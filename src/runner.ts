import { Handler } from 'aws-lambda'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import pLimit from 'p-limit'
import { EvalTask, RunnerEvent } from './lib/types'
import { ModelOutput } from './lib/class/ModelOutput'
import { logger } from './lib/logger'
let openrouter: OpenAI
let ai: GoogleGenAI

export const handler: Handler<RunnerEvent, any> = async (event) => {
  const { execution_id, hydrated_tasks } = event
  const evaluationResults: ModelOutput[] = []
  const limit = pLimit(5)
  // @ts-ignore

  openrouter = new OpenAI({
    apiKey: process.env.OPENAPI_KEY,
    baseURL: 'https://openrouter.ai'
  })

  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock-key' })

  logger.info('Starting concurrent batch execution processing context', {
    execution_id,
    task_count: hydrated_tasks.length
  })

  const startTime = Date.now()
  const inferenceQueue: Array<() => Promise<ModelOutput>> = []

  for (const task of hydrated_tasks) {
    inferenceQueue.push(
      () => runDirectGeminiFlash(task),
      () => runOpenRouterModel(task, 'google/gemini-2.5-flash:free'),
      () => runOpenRouterModel(task, 'nvidia/nemotron-4-340b-instruct:free'),
      () => runOpenRouterModel(task, 'meta-llama/llama-3.1-8b-instruct:free'),
      () => runOpenRouterModel(task, 'openrouter/free')
    )
  }

  logger.debug('Inference queue built successfully, mapping actions to limited pool slots', {
    execution_id,
    total_inferences: inferenceQueue.length
  })

  const workerPromises = inferenceQueue.map((inferenceTask) => {
    return limit(async () => {
      try {
        return await inferenceTask()
      }
      catch (err) {
        logger.error('Uncaught fatal request transaction error inside processing pool context', {
          execution_id,
          error: err instanceof Error ? err.message : String(err)
        })
        throw err
      }
    })
  })

  logger.info(`📦 Dispatched ${workerPromises.length} independent model inferences to worker pool...`)

  const results = await Promise.allSettled(workerPromises)

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      evaluationResults.push(result.value)
    }
  })

  const totalDurationMs = Date.now() - startTime
  logger.info('Inference processing batch completed successfully', {
    execution_id,
    duration_seconds: (totalDurationMs / 1000).toFixed(2),
    total_records_processed: evaluationResults.length
  })

  return {
    execution_id,
    results: evaluationResults
  }
}

// --- ISOLATED NETWORK WORKERS ---

async function runDirectGeminiFlash(task: EvalTask): Promise<ModelOutput> {
  const start = Date.now()
  const model = 'gemini-2.5-flash'
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: task.prompt,
    })
    return new ModelOutput(model, task, response.text || '', Date.now() - start)
  }
  catch (err) {
    logger.warn('Direct Google AI Studio provider transaction failed exception fallback active', {
      task_id: task.task_id,
      error_message: err instanceof Error ? err.message : String(err)
    })
    return new ModelOutput(model, task, `Direct Gemini Error: ${err}`, Date.now() - start)
  }
}

async function runOpenRouterModel(task: EvalTask, modelSlug: string): Promise<ModelOutput> {
  const start = Date.now()
  try {
    const response = await openrouter.chat.completions.create({
      model: modelSlug,
      messages: [ { role: 'user', content: task.prompt } ],
      temperature: 0.2
    })

    const outputText = response.choices?.[0]?.message?.content || ''
    if (!outputText) throw new Error('Empty API response choices returned.')
    return new ModelOutput(modelSlug.replace(':free', ''), task, outputText || '', Date.now() - start)
  }
  catch (err) {
    logger.warn('Open Router provider transaction failed exception fallback active', {
      task_id: task.task_id,
      error_message: err instanceof Error ? err.message : String(err)
    })
    return new ModelOutput(modelSlug.replace(':free', ''), task, `OpenRouter Error: ${err}`, Date.now() - start)
  }
}
