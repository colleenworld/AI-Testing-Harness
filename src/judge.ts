import { Handler } from 'aws-lambda';
import OpenAI from 'openai';
import { Client } from 'pg';

// 1. Initialize OpenAI for the LLM-as-a-Judge out of the handler
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 2. Database Connection Factory utilizing standard Postgres environmental variables
const getDbClient = (): Client => {
    return new Client({
        host: process.env.PGHOST || 'host.docker.internal', // Points to localhost outside Docker
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'eval_admin',
        password: process.env.PGPASSWORD || 'local_secure_password_123',
        database: process.env.PGDATABASE || 'llm_evals',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
};

interface ModelOutput {
    model_name: string;
    task_id: string;
    category: string;
    prompt: string;
    raw_output: string;
    ground_truth: string;
    latency_ms: number;
}

interface JudgeEvent {
    execution_id: string;
    results: ModelOutput[];
}

interface JudgeScores {
    factuality: number;
    citation: number;
    formatting: number;
}

export const handler: Handler<JudgeEvent, any> = async (event) => {
    const { execution_id, results } = event;
    console.log(`Starting Evaluation Matrix for Execution ID: ${execution_id}`);

    const dbClient = getDbClient();
    await dbClient.connect();

    try {
        for (const run of results) {
            console.log(`Judging output for Model: ${run.model_name} | Task: ${run.task_id}`);

            // Call OpenAI to judge the payload content
            const scores = await evaluateOutput(run);

            // Calculate mock API token execution cost (approximation for tracking trends)
            const mockTokenCost = calculateMockCost(run.model_name, run.raw_output.length);

            // Persist the evaluation metrics into PostgreSQL
            const queryText = `
                INSERT INTO evaluation_runs (
                    execution_id, task_id, category, model_name, prompt, 
                    raw_output, ground_truth, score_factuality, 
                    score_citation, score_formatting, latency_ms, token_cost_usd
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
            `;

            const values = [
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
                run.latency_ms,
                mockTokenCost
            ];

            await dbClient.query(queryText, values);
        }

        console.log(`Successfully completed and stored evaluation run: ${execution_id}`);
        return { status: 'SUCCESS', execution_id };

    } catch (error) {
        console.error('Critical failure in Judge logic:', error);
        throw error;
    } finally {
        await dbClient.end();
    }
};

// --- JUDGE EVALUATION MATRIX ---

async function evaluateOutput(run: ModelOutput): Promise<JudgeScores> {
    const systemPrompt = `You are an expert QA evaluation engine for a public search LLM product.
Your job is to grade the model's RAW OUTPUT against the provided GROUND TRUTH.
Provide exactly three integer scores from 1 to 5 based on the following criteria:

1. Factuality & Synthesis: Does the output correctly surface all truths without adding hallucinations?
2. Citation & Source Match: Does the output cite references seamlessly and maintain semantic sourcing alignment?
3. Formatting & Layout Quality: Does the text layout fulfill structural clarity goals?

You MUST respond strictly in the following JSON format without Markdown formatting or wrappers:
{"factuality": 5, "citation": 4, "formatting": 5}`;

    const userPrompt = `[PROMPT]: ${run.prompt}\n\n[RAW OUTPUT]: ${run.raw_output}\n\n[GROUND TRUTH]: ${run.ground_truth}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.0,
            response_format: { type: "json_object" } // Enforces pure structural parsing
        });

        const rawJson = response.choices[0].message.content || '{"factuality":1,"citation":1,"formatting":1}';
        return JSON.parse(rawJson) as JudgeScores;

    } catch (err) {
        console.error(`Failed to judge task ${run.task_id}, returning fallback 1-scores.`, err);
        return { factuality: 1, citation: 1, formatting: 1 };
    }
}

// --- UTILITY COST CALCULATOR ---

function calculateMockCost(modelName: string, textLength: string | number): number {
    const characters = typeof textLength === 'number' ? textLength : 0;
    const approximateTokens = characters / 4;

    // Abstract blended token pricing structures
    switch (modelName) {
        case 'gpt-4o':
            return (approximateTokens / 1_000_000) * 5.00;
        case 'claude-3-5-sonnet':
            return (approximateTokens / 1_000_000) * 3.00;
        case 'gemini-1.5-pro':
            return (approximateTokens / 1_000_000) * 1.25;
        default:
            return (approximateTokens / 1_000_000) * 0.15; // Small open source baseline tier
    }
}
