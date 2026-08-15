-- Core evaluation tracking schema
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
    -- JSONB column captures flexible LLM-as-a-judge score variations natively
    parsed_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
-- Index nested JSONB fields for high-performance downstream analytical lookup queries
CREATE INDEX IF NOT EXISTS idx_eval_results_metrics ON evaluation_results USING gin (parsed_metrics);
CREATE INDEX IF NOT EXISTS idx_eval_results_task ON evaluation_results (task_id);
