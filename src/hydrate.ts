import { Handler } from 'aws-lambda';
import { Client } from 'pg';
import axios from 'axios';

// 1. Database Connection Factory utilizing standard Postgres environmental variables
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

interface TaskRow {
    task_id: string;
    category: string;
    prompt: string;
    search_query_template: string; // E.g., "Perplexity corporate earnings results August 2026"
}

interface HydratedTask {
    task_id: string;
    category: string;
    prompt: string;
    dynamic_ground_truth: string;
}

interface HydrateEvent {
    execution_id?: string;
}

export const handler: Handler<HydrateEvent, any> = async (event) => {
    // Generate a unique fallback execution ID if not passed from a parent Step Function trigger
    const execution_id = event.execution_id || `run_${Date.now()}`;
    console.log(`Initializing Dataset Hydration Pipeline for Run: ${execution_id}`);

    const dbClient = getDbClient();
    await dbClient.connect();

    try {
        // 2. Fetch the base 50 tasks from your golden dataset repository table
        // (For testing purposes, you can create a 'golden_tasks' reference table in your DB)
        const queryText = 'SELECT task_id, category, prompt, search_query_template FROM golden_tasks LIMIT 50;';
        const res = await dbClient.query(queryText);
        const staticTasks: TaskRow[] = res.rows;

        // Fallback placeholder logic if your local table is empty during initial setup
        const sourceTasks = staticTasks.length > 0 ? staticTasks : getFallbackLocalDataset();

        const hydratedTasks: HydratedTask[] = [];

        // 3. Process tasks and hydrate live facts in parallel blocks to speed up execution
        const hydrationPromises = sourceTasks.map(async (task) => {
            let liveContext = 'No live lookup required.';

            if (task.search_query_template) {
                try {
                    liveContext = await fetchLiveWebContext(task.search_query_template);
                } catch (searchError) {
                    console.error(`Failed live search for Task ${task.task_id}:`, searchError);
                    liveContext = 'Search engine timeout - fallback applied.';
                }
            }

            return {
                task_id: task.task_id,
                category: task.category,
                prompt: task.prompt,
                dynamic_ground_truth: `[Verified Fact Context]: ${liveContext}`
            };
        });

        const completedTasks = await Promise.all(hydrationPromises);
        hydratedTasks.push(...completedTasks);

        console.log(`Successfully hydrated ${hydratedTasks.length} tasks with real-time variables.`);

        // 4. Return structural payload matching exactly what ModelRunnerFunction expects
        return {
            execution_id,
            hydrated_tasks: hydratedTasks
        };

    } catch (error) {
        console.error('Critical failure during dataset hydration stage:', error);
        throw error;
    } finally {
        await dbClient.end();
    }
};

// --- REAL-TIME WEB SEARCH INTEGRATION ---

async function fetchLiveWebContext(query: string): Promise<string> {
    const t_api_key = process.env.TAVILY_API_KEY;

    if (!t_api_key || t_api_key === 'mock-key') {
        return `Mocked live response context for search topic: "${query}"`;
    }

    // Call Tavily Search API wrapper extracting highly concentrated context snippets
    const response = await axios.post('https://tavily.com', {
        api_key: t_api_key,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 3
    }, { timeout: 8000 });

    return response.data.answer || JSON.stringify(response.data.results);
}

// --- BOOTSTRAP SEED FALLBACK DATA ---

function getFallbackLocalDataset(): TaskRow[] {
    return [
        {
            task_id: "task_01",
            category: "Temporal & Live News",
            prompt: "What were the key financial takeaway metrics from the corporate earnings report released today?",
            search_query_template: "latest company corporate earnings revenue net income today"
        },
        {
            task_id: "task_02",
            category: "Multi-Source Synthesis",
            prompt: "Synthesize the conflicting perspectives around the newly proposed regulatory data laws.",
            search_query_template: "regulatory data compliance laws arguments pros cons 2026"
        }
    ];
}
