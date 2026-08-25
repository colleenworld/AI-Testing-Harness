"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const axios_1 = __importDefault(require("axios"));
const dbPool_1 = __importDefault(require("./lib/dbPool"));
const logger_1 = require("./lib/logger");
const handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    const execution_id = event.execution_id || `run_${Date.now()}`;
    try {
        const queryText = 'SELECT task_id, category, prompt, search_query_template FROM golden_tasks LIMIT 50;';
        const res = yield dbPool_1.default.query(queryText);
        const staticTasks = res.rows;
        const sourceTasks = staticTasks.length > 0 ? staticTasks : getFallbackLocalDataset();
        const hydratedTasks = [];
        const hydrationPromises = sourceTasks.map((task) => __awaiter(void 0, void 0, void 0, function* () {
            let liveContext = 'No live lookup required.';
            if (task.search_query_template) {
                try {
                    liveContext = yield fetchLiveWebContext(task.search_query_template);
                }
                catch (err) {
                    logger_1.logger.error('Failed live search for Task', {
                        execution_id,
                        taskId: task.task_id,
                        error: err instanceof Error ? err.message : String(err)
                    });
                    liveContext = 'Search engine timeout - fallback applied.';
                }
            }
            return {
                task_id: task.task_id,
                category: task.category,
                prompt: task.prompt,
                dynamic_ground_truth: `[Verified Fact Context]: ${liveContext}`
            };
        }));
        const completedTasks = yield Promise.all(hydrationPromises);
        hydratedTasks.push(...completedTasks);
        return {
            execution_id,
            hydrated_tasks: hydratedTasks
        };
    }
    catch (err) {
        logger_1.logger.error('Critical failure during dataset hydration stage', {
            execution_id,
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
});
exports.handler = handler;
function fetchLiveWebContext(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const t_api_key = process.env.TAVILY_API_KEY;
        if (!t_api_key || t_api_key === 'mock-key') {
            return `Mocked live response context for search topic: "${query}"`;
        }
        const response = yield axios_1.default.post('https://tavily.com', {
            api_key: t_api_key,
            query: query,
            search_depth: 'basic',
            include_answer: true,
            max_results: 3
        }, { timeout: 8000 });
        return response.data.answer || JSON.stringify(response.data.results);
    });
}
function getFallbackLocalDataset() {
    return [
        {
            task_id: 'task_01',
            category: 'Temporal & Live News',
            prompt: 'What were the key financial takeaway metrics from the corporate earnings report released today?',
            search_query_template: 'latest company corporate earnings revenue net income today'
        },
        {
            task_id: 'task_02',
            category: 'Multi-Source Synthesis',
            prompt: 'Synthesize the conflicting perspectives around the newly proposed regulatory data laws.',
            search_query_template: 'regulatory data compliance laws arguments pros cons 2026'
        }
    ];
}
