import { Handler } from 'aws-lambda'
import { GoogleGenAI } from '@google/genai'
import { JudgeEvent, JudgeScores } from './lib/types'
import { z } from 'zod'
import { logger } from './lib/logger'
import { safeQuery } from './lib/dbPool'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

const JudgeScoresSchema = z.object({
  factuality: z.number().int().min(1).max(5),
  citation: z.number().int().min(1).max(5),
  formatting: z.number().int().min(1).max(5)
})

export const handler: Handler<JudgeEvent, any> = async (event) => {
  const { execution_id, results } = event
  logger.info('Starting Batch Evaluation Execution', {
    execution_id,
  })

  try {
    const queryPromises = results.map(async (run) => {
      const scores = await evaluateOutput(run)
      const queryText = `
                INSERT INTO evaluation_runs (
                    execution_id, task_id, category, model_name, prompt, 
                    raw_output, ground_truth, score_factuality, 
                    score_citation, score_formatting, latency_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
            `
      return safeQuery(queryText, [
        execution_id,
        run.task_id,
        run.category,
        run.model_name,
        run.prompt,
        run.raw_output,
        run.ground_truth,
        scores.factuality,
        scores.citation,
        scores.formatting,
        run.latency_ms
      ])
    })

    await Promise.all(queryPromises)
    return { status: 'SUCCESS', count: results.length }
  }
  catch (err) {
    logger.error('Database logging failure:', {
      error: err instanceof Error ? err.message : String(err)
    })
    throw err
  }
}

async function evaluateOutput(run: any): Promise<JudgeScores> {
  const systemPrompt = `You are an expert QA evaluation engine. 
Grade the model's raw output against the provided ground truth.
You MUST output raw JSON text strictly containing these three keys: factuality, citation, formatting. 
The value for each key must be an integer score between 1 and 5. Do not include markdown code block syntax.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `${systemPrompt}\n\n[PROMPT]: ${run.prompt}\n\n[OUTPUT]: ${run.raw_output}\n\n[TRUTH]: ${run.ground_truth}`,
      config: { responseMimeType: 'application/json' }
    })

    const rawText = response.text || ''
    const sanitizedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsedJson = JSON.parse(sanitizedJson)

    return JudgeScoresSchema.parse(parsedJson)

  }
  catch (err) {
    logger.warn('Schema validation rejected LLM Output:', {
      taskId: run.task_id,
      error: err instanceof Error ? err.message : String(err)
    })
    return { factuality: 1, citation: 1, formatting: 1 }
  }
}
