import pLimit from 'p-limit'
import { z } from 'zod'
import type { ModelOutput } from '../lib/types'
import { logger } from '../lib/logger'
import { safeQuery } from '../lib/dbPool'
import type { ApiKeysSecret } from '../lib/secret'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'

const JUDGE_CONCURRENCY = 5

export interface JudgeResult {
  execution_id: string
  status: 'SUCCESS'
  count: number
}

const JudgeScoresSchema = z.object({
  factuality: z.number().int().min(1).max(5),
  citation: z.number().int().min(1).max(5),
  formatting: z.number().int().min(1).max(5)
})

type JudgeScores = z.infer<typeof JudgeScoresSchema>

export async function judgeResults(
  apiKeys: ApiKeysSecret,
  executionId: string,
  results: ModelOutput[]
): Promise<JudgeResult> {
  const ai = new OpenAI({
    apiKey: apiKeys.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
  })

  const limit = pLimit(JUDGE_CONCURRENCY)

  logger.info('Starting batch evaluation', {
    execution_id: executionId,
    result_count: results.length,
    concurrency: JUDGE_CONCURRENCY
  })

  try {
    await saveEvaluationBatch(
      executionId,
      results.length
    )

    const judgePromises = results.map(run =>
      limit(async () => {
        const scores = await judgeResponse(ai, run)

        await saveEvaluation(
          executionId,
          run,
          scores
        )
      })
    )

    const settledResults = await Promise.allSettled(
      judgePromises
    )

    const rejectedResults = settledResults.filter(
      result => result.status === 'rejected'
    )

    if (rejectedResults.length > 0) {
      const firstFailure =
        rejectedResults[0] as PromiseRejectedResult

      logger.error('One or more evaluation records failed', {
        execution_id: executionId,
        failed_count: rejectedResults.length,
        error: getErrorMessage(firstFailure.reason)
      })

      throw new Error(
        `${rejectedResults.length} evaluation records failed to save`
      )
    }

    logger.info('Batch evaluation completed successfully', {
      execution_id: executionId,
      count: results.length
    })

    return {
      execution_id: executionId,
      status: 'SUCCESS',
      count: results.length
    }
  }
  catch (error: unknown) {
    logger.error(
      'Evaluation judging or database logging failed',
      {
        execution_id: executionId,
        error: getErrorMessage(error)
      }
    )

    throw error
  }
}

async function saveEvaluationBatch(
  executionId: string,
  totalRecords: number
): Promise<void> {
  await safeQuery(
    `INSERT INTO evaluation_batches (
       execution_id,
       service_name,
       environment,
       total_records
     )
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (execution_id)
     DO UPDATE SET
       service_name = EXCLUDED.service_name,
       environment = EXCLUDED.environment,
       total_records = EXCLUDED.total_records`,
    [
      executionId,
      'evaluation-harness',
      process.env.NODE_ENV ?? 'dev',
      totalRecords
    ]
  )
}

async function judgeResponse(
  ai: OpenAI,
  run: ModelOutput
): Promise<JudgeScores> {
  const prompt = `
You are an expert QA evaluation engine.
Grade the model's raw output against the provided ground truth.

    User query: ${run.prompt}, 
    Raw output: ${run.raw_output}, 
    Ground truth: ${run.ground_truth}

Return JSON containing exactly these three keys:

- factuality
- citation
- formatting

Each value must be an integer between 1 and 5.
Do not include Markdown or a JSON code fence.
`.trim()

  const completion = await ai.chat.completions.create({
    model: 'gpt-4o',
    messages: [ { role: 'user', content: prompt } ],
    response_format: zodResponseFormat(JudgeScoresSchema, 'evaluation'),
  })

  const messageContent = completion.choices[0].message.content

  if (!messageContent) {
    throw new Error('Failed to get a response from the judge model.')
  }

  return JSON.parse(messageContent) as JudgeScores
}

async function saveEvaluation(
  executionId: string,
  run: ModelOutput,
  scores: JudgeScores
): Promise<void> {
  await safeQuery(
    `INSERT INTO evaluation_results (
       execution_id,
       task_id,
       category,
       prompt,
       raw_output,
       ground_truth,
       latency_ms,
       parsed_metrics,
       model_version
     )
     VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8::jsonb, $9
     )`,
    [
      executionId,
      run.task_id,
      run.category,
      run.prompt,
      run.raw_output,
      run.ground_truth,
      run.latency_ms,
      JSON.stringify({
        factuality: scores.factuality,
        citation: scores.citation,
        formatting: scores.formatting
      }),
      run.model_name
    ]
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error)
}