import OpenAI from 'openai'
import pLimit from 'p-limit'
import { ModelOutput, EvalTask } from '../lib/types'
import { logger } from '../lib/logger'
import { safeQuery } from '../lib/dbPool'
import { ApiKeysSecret } from '../lib/secret'
const CONCURRENCY_LIMIT = 5
const ModelSlugs = [ 'cohere/north-mini-code:free', 'inclusionai/ling-3.0-flash-fin:free', 'nvidia/nemotron-3.5-content-safety:free', 'openrouter/free' ]
export interface RunnerResult {
  execution_id: string
  results: ModelOutput[]
  attempted: number
  completed: number
}

const TASKS_PER_RUN = 10

export async function loadHydratedTasks(): Promise<EvalTask[]> {
  const result = await safeQuery(
    `SELECT
       gt.task_id,
       gt.category,
       gt.prompt,
       gt.dynamic_ground_truth
     FROM golden_tasks gt
     LEFT JOIN (
       SELECT
         task_id,
         MAX(created_at) AS last_evaluated_at
       FROM evaluation_results
       GROUP BY task_id
     ) er
       ON er.task_id = gt.task_id
     WHERE gt.dynamic_ground_truth IS NOT NULL
     ORDER BY
       er.last_evaluated_at ASC NULLS FIRST,
       gt.task_id ASC
     LIMIT $1`,
    [ TASKS_PER_RUN ]
  )

  return result.rows as EvalTask[]
}

export async function runEvaluations(
  apiKeys: ApiKeysSecret,
  executionId: string
): Promise<RunnerResult> {

  const hydratedTasks = await loadHydratedTasks()

  if (hydratedTasks.length === 0) {
    throw new Error(
      'No hydrated tasks found. Run the hydration bootstrap first.'
    )
  }

  const openrouter = new OpenAI({
    apiKey: apiKeys.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
  })

  const limit = pLimit(CONCURRENCY_LIMIT)
  const startTime = Date.now()

  const inferenceQueue: Array<() => Promise<ModelOutput>> = []

  for (const task of hydratedTasks) {
    for (const modelSlug of ModelSlugs) {
      inferenceQueue.push(
        () => runOpenRouterModel(
          openrouter,
          task,
          modelSlug
        )
      )
    }
  }

  logger.info('Starting concurrent model evaluation batch', {
    execution_id: executionId,
    task_count: hydratedTasks.length,
    inference_count: inferenceQueue.length,
    concurrency: CONCURRENCY_LIMIT
  })

  const settledResults = await Promise.allSettled(
    inferenceQueue.map(inferenceTask =>
      limit(() => inferenceTask())
    )
  )

  const evaluationResults: ModelOutput[] = []

  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      evaluationResults.push(result.value)
    }
    else {
      logger.error('Unhandled model inference failure', {
        execution_id: executionId,
        error: getErrorMessage(result.reason)
      })
    }
  }

  const durationMs = Date.now() - startTime

  logger.info('Model evaluation batch completed', {
    execution_id: executionId,
    duration_seconds: durationMs / 1000,
    attempted: inferenceQueue.length,
    completed: evaluationResults.length,
    failed: inferenceQueue.length - evaluationResults.length
  })

  return {
    execution_id: executionId,
    results: evaluationResults,
    attempted: inferenceQueue.length,
    completed: evaluationResults.length
  }
}

async function runOpenRouterModel(
  openrouter: OpenAI,
  task: EvalTask,
  modelSlug: string
): Promise<ModelOutput> {
  const start = Date.now()
  const reportedModel = modelSlug.replace(':free', '')

  try {
    const response = await openrouter.chat.completions.create({
      model: modelSlug,
      messages: [
        {
          role: 'user',
          content: task.prompt
        }
      ],
      temperature: 0.2
    })

    const outputText = response.choices?.[0]?.message?.content

    if (!outputText) {
      throw new Error('OpenRouter returned an empty response')
    }

    return new ModelOutput(
      reportedModel,
      task,
      outputText,
      Date.now() - start
    )
  }
  catch (error) {
    logger.warn('OpenRouter inference failed', {
      task_id: task.task_id,
      model: modelSlug,
      error: getErrorMessage(error)
    })

    return new ModelOutput(
      reportedModel,
      task,
      `OpenRouter Error: ${getErrorMessage(error)}`,
      Date.now() - start
    )
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}