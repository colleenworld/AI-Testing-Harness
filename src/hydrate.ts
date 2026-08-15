import { Handler } from 'aws-lambda'
import axios from 'axios'
import pool from './lib/dbPool'
import { TaskRow, HydratedTask, HydrateEvent } from './lib/types'
import { logger } from './lib/logger'

export const handler: Handler<HydrateEvent, any> = async (event) => {
  const execution_id = event.execution_id || `run_${Date.now()}`

  try {
    const queryText = 'SELECT task_id, category, prompt, search_query_template FROM golden_tasks LIMIT 50;'
    const res = await pool.query(queryText)
    const staticTasks: TaskRow[] = res.rows
    const sourceTasks = staticTasks.length > 0 ? staticTasks : getFallbackLocalDataset()
    const hydratedTasks: HydratedTask[] = []

    const hydrationPromises = sourceTasks.map(async (task) => {
      let liveContext = 'No live lookup required.'

      if (task.search_query_template) {
        try {
          liveContext = await fetchLiveWebContext(task.search_query_template)
        }
        catch (err) {
          logger.error('Failed live search for Task', {
            execution_id,
            taskId: task.task_id,
            error: err instanceof Error ? err.message : String(err)
          })
          liveContext = 'Search engine timeout - fallback applied.'
        }
      }

      return {
        task_id: task.task_id,
        category: task.category,
        prompt: task.prompt,
        dynamic_ground_truth: `[Verified Fact Context]: ${liveContext}`
      }
    })

    const completedTasks = await Promise.all(hydrationPromises)
    hydratedTasks.push(...completedTasks)

    return {
      execution_id,
      hydrated_tasks: hydratedTasks
    }

  }
  catch (err) {
    logger.error('Critical failure during dataset hydration stage', {
      execution_id,
      error: err instanceof Error ? err.message : String(err)
    })
    throw err
  }
}

async function fetchLiveWebContext(query: string): Promise<string> {
  const t_api_key = process.env.TAVILY_API_KEY

  if (!t_api_key || t_api_key === 'mock-key') {
    return `Mocked live response context for search topic: "${query}"`
  }

  const response = await axios.post('https://tavily.com', {
    api_key: t_api_key,
    query: query,
    search_depth: 'basic',
    include_answer: true,
    max_results: 3
  }, { timeout: 8000 })

  return response.data.answer || JSON.stringify(response.data.results)
}

function getFallbackLocalDataset(): TaskRow[] {
  return [
    {
      task_id: 'task_01',
      category: 'Temporal & Live News',
      prompt: 'What were the key financial takeaway metrics from the corporate earnings report released today?',
      search_query_template: 'latest company corporate earnings revenue net income today'
    },
    {
      task_id: 'task_02',
      category: 'Multi-Source Synthesis',
      prompt: 'Synthesize the conflicting perspectives around the newly proposed regulatory data laws.',
      search_query_template: 'regulatory data compliance laws arguments pros cons 2026'
    }
  ]
}
