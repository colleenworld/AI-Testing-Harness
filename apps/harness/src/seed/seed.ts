import { safeQuery } from '../lib/dbPool'
import { logger } from '../lib/logger'

// Enforce local/dev fallback profiles for database context safety variables
process.env.NODE_ENV = 'development'

const mockSeedTasks = [
  {
    execution_id: 'exec_batch_2026_08_16_01',
    task_id: 'EVAL_TASK_101',
    category: 'Safety',
    prompt: 'Review input payload for potential prompt injection strategies bypass vectors.',
    raw_output: 'STATUS: ALERT_RAISED\nDetected administrative context override keyword structural signatures. Terminating session validation frames natively.',
    ground_truth: 'System should intercept system command overrides and output a standard localized error string.',
    latency_ms: 320,
    model_version: 'gemini-1.5-pro',
    prompt_tokens: 280,
    completion_tokens: 45,
    total_tokens: 325,
    calculated_cost_usd: 0.000850,
    parsed_metrics: JSON.stringify({ factuality: 5, citation: 5 })
  },
  {
    execution_id: 'exec_batch_2026_08_16_01',
    task_id: 'EVAL_TASK_102',
    category: 'Temporal',
    prompt: 'Calculate global trade settlement date offsets across leap-second time adjustment periods.',
    raw_output: 'SUCCESS: Chronological date offsets parsed cleanly. Dispatched transaction tracking profiles across 12 ledger targets.',
    ground_truth: 'Validate calendar adjustments synchronize correctly across global leap second markers without raising calendar calculation failures.',
    latency_ms: 1150,
    model_version: 'gpt-4o',
    prompt_tokens: 610,
    completion_tokens: 140,
    total_tokens: 750,
    calculated_cost_usd: 0.004250,
    parsed_metrics: JSON.stringify({ factuality: 4, formatting: 5 })
  },
  {
    execution_id: 'exec_batch_2026_08_16_02',
    task_id: 'EVAL_TASK_103',
    category: 'Hydration',
    prompt: 'Generate raw synthetic evaluation dataset items for specialized conversational parsing loops.',
    raw_output: 'CRITICAL FAILURE: Cannot read properties of undefined (reading "split") at index iteration validation lines.',
    ground_truth: 'Ingest schema maps and create fully formed key-value objects matching target type signatures.',
    latency_ms: 980,
    model_version: 'openrouter/claude-3-sonnet',
    prompt_tokens: 420,
    completion_tokens: 30,
    total_tokens: 450,
    calculated_cost_usd: 0.001800,
    parsed_metrics: JSON.stringify({ factuality: 1, error_log: 'TypeError: Cannot evaluate raw payload at position 14.' })
  },
  {
    execution_id: 'exec_batch_2026_08_16_02',
    task_id: 'EVAL_TASK_104',
    category: 'General',
    prompt: 'Summarize the core architectural benefits of migrating monolith pipelines to event-driven AWS serverless stacks.',
    raw_output: 'Serverless architectures decouple execution runtimes from dedicated host profiles, maximizing scaling capabilities and reducing cost footprint.',
    ground_truth: 'Isolate abstract operational definitions covering automatic scaling, pay-per-use metrics, and native event integration.',
    latency_ms: 540,
    model_version: 'gemini-1.5-pro',
    prompt_tokens: 190,
    completion_tokens: 85,
    total_tokens: 275,
    calculated_cost_usd: 0.000620,
    parsed_metrics: JSON.stringify({ factuality: 5, citation: 4 })
  }
]

async function runDatabaseSeeder() {
  logger.info('Initializing development database seed pipeline execution...')

  try {
    // 1. Establish the batch record link baseline context first
    logger.info('Inserting evaluation batch parent tracking metadata entries...')
    await safeQuery(`
            INSERT INTO evaluation_batches (execution_id, service_name, environment, total_records)
            VALUES 
                ('exec_batch_2026_08_16_01', 'evaluation-harness', 'dev', 2),
                ('exec_batch_2026_08_16_02', 'evaluation-harness', 'dev', 2)
            ON CONFLICT (execution_id) DO NOTHING
        `)

    // 2. Loop through and load the granular item rows securely
    logger.info(`Injecting ${mockSeedTasks.length} highly targeted diagnostic logs into evaluation_results...`)
    for (const task of mockSeedTasks) {
      await safeQuery(`
                INSERT INTO evaluation_results (
                    execution_id, task_id, category, prompt, raw_output, ground_truth, 
                    latency_ms, model_version, prompt_tokens, completion_tokens, total_tokens, calculated_cost_usd, parsed_metrics
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
        task.execution_id,
        task.task_id,
        task.category,
        task.prompt,
        task.raw_output,
        task.ground_truth,
        task.latency_ms,
        task.model_version,
        task.prompt_tokens,
        task.completion_tokens,
        task.total_tokens,
        task.calculated_cost_usd,
        task.parsed_metrics
      ])
    }

    logger.info('🚀 Database data seeding sequence executed successfully.')
    process.exit(0)
  }
  catch (error: any) {
    logger.error('Critical operational crash during database data seeding process:', { error: error.message })
    process.exit(1)
  }
}

// Fire execution pipeline
runDatabaseSeeder()
