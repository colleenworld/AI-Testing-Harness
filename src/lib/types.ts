export interface RunnerEvent {
    execution_id: string;
    hydrated_tasks: EvalTask[];
}

export interface JudgeEvent {
    execution_id: string;
    results: ModelOutput[];
}

export interface EvalTask {
    task_id: string;
    category: string;
    prompt: string;
    dynamic_ground_truth: string;
}

export interface ModelOutput {
    model_name: string;
    task_id: string;
    category: string;
    prompt: string;
    raw_output: string;
    ground_truth: string;
    latency_ms: number;
}

export interface JudgeScores {
    factuality: number;
    citation: number;
    formatting: number;
}