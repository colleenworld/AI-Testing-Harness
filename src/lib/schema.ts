export const schema = `
CREATE TABLE IF NOT EXISTS evaluation_batches (
    execution_id VARCHAR(255) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    total_records INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluation_results (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(255) REFERENCES evaluation_batches(execution_id) ON DELETE CASCADE,
    task_id VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    raw_output TEXT,
    ground_truth TEXT,
    latency_ms INT,
    parsed_metrics JSONB DEFAULT '{}'::jsonb,
    model_version VARCHAR(100) NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    calculated_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eval_results_model ON evaluation_results (model_version);
CREATE INDEX IF NOT EXISTS idx_eval_results_cat_model ON evaluation_results (category, model_version);
CREATE INDEX IF NOT EXISTS idx_eval_results_metrics ON evaluation_results USING gin (parsed_metrics);
`;
