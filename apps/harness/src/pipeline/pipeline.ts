import { Handler } from 'aws-lambda'
import {
  runEvaluations
} from './runner'
import { judgeResults } from './judge'
import { whisper, ApiKeysSecret } from '../lib/secret'

interface PipelineEvent {
  execution_id?: string
}

interface PipelineResult {
  execution_id: string
  status: 'SUCCESS'
  inference_count: number
  evaluation_count: number
}

export const handler: Handler<PipelineEvent, PipelineResult> = async event => {
  const executionId =
    event.execution_id ?? `evaluation_${Date.now()}`

  const apiKeys = await whisper<ApiKeysSecret>('API_KEYS_SECRET_ARN')

  const runnerResult = await runEvaluations(
    apiKeys,
    executionId
  )

  const judgeResult = await judgeResults(
    apiKeys,
    executionId,
    runnerResult.results
  )

  return {
    execution_id: executionId,
    status: 'SUCCESS',
    inference_count: runnerResult.completed,
    evaluation_count: judgeResult.count
  }
}