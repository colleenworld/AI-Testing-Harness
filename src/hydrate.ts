import type { Handler } from 'aws-lambda'
import axios from 'axios'
import { safeQuery } from './lib/dbPool'
import { logger } from './lib/logger'
import { ApiKeysSecret, whisper } from './lib/secret'

interface HydratedTask {
  task_id: string;
  category: string;
  prompt: string;
  dynamic_ground_truth: string;
}

export interface HydratedTaskRow {
  task_id: string;
  category: string;
  prompt: string;
  search_query_template: string; // E.g., "Perplexity corporate earnings results August 2026"
}

interface HydrateEvent {
  execution_id?: string;
}

export const handler: Handler<HydrateEvent, any> = async event => {
  const executionId =
    event.execution_id ?? `run_${Date.now()}`
  const apiKeys = await whisper<ApiKeysSecret>('API_KEYS_SECRET_ARN')

  try {
    const result = await safeQuery(
      `SELECT
         task_id,
         category,
         prompt,
         search_query_template
       FROM golden_tasks
       ORDER BY task_id
       LIMIT 50`
    )

    const sourceTasks = result.rows as HydratedTaskRow[]

    const hydrationPromises = sourceTasks.map(
      async (task): Promise<HydratedTask> => {
        let liveContext = 'No live lookup required.'
        if (task.search_query_template) {
          try {
            liveContext = await fetchLiveWebContext(
              task.search_query_template,
              apiKeys
            )
          }
          catch (error: unknown) {
            logger.error('Failed in live search for task', {
              execution_id: executionId,
              task_id: task.task_id,
              error: getErrorMessage(error)
            })

            liveContext =
              'Search engine timeout - fallback applied.'
          }
        }

        const dynamicGroundTruth =
          `[Verified Fact Context]: ${liveContext}`

        await safeQuery(
          `UPDATE golden_tasks
           SET
             dynamic_ground_truth = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE task_id = $2`,
          [
            dynamicGroundTruth,
            task.task_id
          ]
        )

        return {
          task_id: task.task_id,
          category: task.category,
          prompt: task.prompt,
          dynamic_ground_truth: dynamicGroundTruth
        }
      }
    )

    const hydratedTasks = await Promise.all(
      hydrationPromises
    )

    logger.info('Dataset hydration completed', {
      execution_id: executionId,
      hydrated_task_count: hydratedTasks.length
    })

    return {
      execution_id: executionId,
      hydrated_tasks: hydratedTasks
    }
  }
  catch (error: unknown) {
    logger.error(
      'Critical failure during dataset hydration stage',
      {
        execution_id: executionId,
        error: getErrorMessage(error)
      }
    )
    throw error
  }
}

async function fetchLiveWebContext(
  query: string,
  apiKeys: ApiKeysSecret
): Promise<string> {

  const response = await axios.post(
    'https://api.tavily.com/search',
    {
      api_key: apiKeys.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 3
    },
    {
      timeout: 8000
    }
  )

  return (
    response.data.answer ??
        JSON.stringify(response.data.results)
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error)
}