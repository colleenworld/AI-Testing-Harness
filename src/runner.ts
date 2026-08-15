import { Handler } from 'aws-lambda'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import pLimit from 'p-limit'
import { EvalTask, RunnerEvent, ModelOutput } from './lib/types'
import { logger } from './lib/logger'

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || 'mock-key',
  baseURL: 'https://openrouter.ai'
})

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock-key' })

export const handler: Handler<RunnerEvent, any> = async (event) => {
  const { execution_id, hydrated_tasks } = event
  const evaluationResults: ModelOutput[] = []
  const limit = pLimit(5)

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

  // 3. BIND TO WORKER POOL AND DISPATCH SIMULTANEOUSLY
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

  console.log(`📦 Dispatched ${workerPromises.length} independent model inferences to worker pool...`)

  // 4. AWAIT BATCH COMPLETION COHESIVELY
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
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: task.prompt,
    })
    return {
      model_name: 'direct-gemini-2.5-flash',
      task_id: task.task_id,
      category: task.category,
      prompt: task.prompt,
      raw_output: response.text || '',
      ground_truth: task.dynamic_ground_truth,
      latency_ms: Date.now() - start
    }
  }
  catch (err) {
    logger.warn('Direct Google AI Studio provider transaction failed exception fallback active', {
      task_id: task.task_id,
      error_message: err instanceof Error ? err.message : String(err)
    })
    return {
      model_name: 'direct-gemini-2.5-flash',
      task_id: task.task_id,
      category: task.category,
      prompt: task.prompt,
      raw_output: `Direct Gemini Error: ${err}`,
      ground_truth: task.dynamic_ground_truth,
      latency_ms: Date.now() - start
    }
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

    return {
      model_name: modelSlug.replace(':free', ''),
      task_id: task.task_id,
      category: task.category,
      prompt: task.prompt,
      raw_output: outputText,
      ground_truth: task.dynamic_ground_truth,
      latency_ms: Date.now() - start
    }
  }
  catch (err) {
    logger.warn('Open Router provider transaction failed exception fallback active', {
      task_id: task.task_id,
      error_message: err instanceof Error ? err.message : String(err)
    })
    return {
      model_name: modelSlug.replace(':free', ''),
      task_id: task.task_id,
      category: task.category,
      prompt: task.prompt,
      raw_output: `OpenRouter Error: ${err}`,
      ground_truth: task.dynamic_ground_truth,
      latency_ms: Date.now() - start
    }
  }
}
