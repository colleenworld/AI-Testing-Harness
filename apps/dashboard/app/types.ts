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