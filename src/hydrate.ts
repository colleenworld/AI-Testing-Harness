import type { Handler } from 'aws-lambda'
import axios from 'axios'
import { safeQuery } from './lib/dbPool'
import type {
  TaskRow,
  HydratedTask,
  HydrateEvent
} from './lib/types'
import { logger } from './lib/logger'

export const handler: Handler<HydrateEvent, any> = async (event) => {
  const execution_id =
    event.execution_id || `run_${Date.now()}`

  try {
    const queryText = `
      SELECT
        task_id,
        category,
        prompt,
        search_query_template
      FROM golden_tasks
      LIMIT 50
    `

    const result = await safeQuery(queryText)
    const sourceTasks = result.rows as TaskRow[]

    const hydrationPromises = sourceTasks.map(
      async (task): Promise<HydratedTask> => {
        let liveContext = 'No live lookup required.'

        if (task.search_query_template) {
          try {
            liveContext = await fetchLiveWebContext(
              task.search_query_template
            )
          }
          catch (error: unknown) {
            logger.error('Failed live search for task', {
              execution_id,
              taskId: task.task_id,
              error:
                    error instanceof Error
                      ? error.message
                      : String(error)
            })

            liveContext =
              'Search engine timeout - fallback applied.'
          }
        }

        return {
          task_id: task.task_id,
          category: task.category,
          prompt: task.prompt,
          dynamic_ground_truth:
                `[Verified Fact Context]: ${liveContext}`
        }
      }
    )

    const hydratedTasks = await Promise.all(
      hydrationPromises
    )

    return {
      execution_id,
      hydrated_tasks: hydratedTasks
    }
  }
  catch (error: unknown) {
    logger.error(
      'Critical failure during dataset hydration stage',
      {
        execution_id,
        error:
              error instanceof Error
                ? error.message
                : String(error)
      }
    )

    throw error
  }
}

async function fetchLiveWebContext(
  query: string
): Promise<string> {
  const tavilyApiKey = process.env.TAVILY_API_KEY

  if (!tavilyApiKey) {
    throw new Error('TAVILY_API_KEY is not configured')
  }

  const response = await axios.post(
    'https://tavily.com',
    {
      api_key: tavilyApiKey,
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