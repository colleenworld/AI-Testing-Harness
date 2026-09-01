import { z } from 'zod'

export const EvaluationConfigSchema = z.object({
  provider: z.enum(['openai', 'google', 'bedrock', 'openrouter']),
  prompt: z.string().min(1),
  maxTokens: z.number().int().positive().default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
});

export type EvaluationConfig = z.infer<typeof EvaluationConfigSchema>;

export interface EvaluationResult {
    id: number;
    task_id: string;
    category: string;
    prompt: string;
    raw_output: string;
    ground_truth: string;
    latency_ms: number;
    model_version: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    calculated_cost_usd: number;
    parsed_metrics: {
        factuality?: number;
        citation?: number;
        formatting?: number;
        error_log?: string;
    };
    created_at: string;
}

