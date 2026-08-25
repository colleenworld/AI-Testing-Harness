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
const openai_1 = __importDefault(require("openai"));
const genai_1 = require("@google/genai");
const p_limit_1 = __importDefault(require("p-limit"));
const logger_1 = require("./lib/logger");
const openrouter = new openai_1.default({
    apiKey: process.env.OPENROUTER_API_KEY || 'mock-key',
    baseURL: 'https://openrouter.ai'
});
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock-key' });
const handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    const { execution_id, hydrated_tasks } = event;
    const evaluationResults = [];
    const limit = (0, p_limit_1.default)(5);
    logger_1.logger.info('Starting concurrent batch execution processing context', {
        execution_id,
        task_count: hydrated_tasks.length
    });
    const startTime = Date.now();
    const inferenceQueue = [];
    for (const task of hydrated_tasks) {
        inferenceQueue.push(() => runDirectGeminiFlash(task), () => runOpenRouterModel(task, 'google/gemini-2.5-flash:free'), () => runOpenRouterModel(task, 'nvidia/nemotron-4-340b-instruct:free'), () => runOpenRouterModel(task, 'meta-llama/llama-3.1-8b-instruct:free'), () => runOpenRouterModel(task, 'openrouter/free'));
    }
    logger_1.logger.debug('Inference queue built successfully, mapping actions to limited pool slots', {
        execution_id,
        total_inferences: inferenceQueue.length
    });
    // 3. BIND TO WORKER POOL AND DISPATCH SIMULTANEOUSLY
    const workerPromises = inferenceQueue.map((inferenceTask) => {
        return limit(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                return yield inferenceTask();
            }
            catch (err) {
                logger_1.logger.error('Uncaught fatal request transaction error inside processing pool context', {
                    execution_id,
                    error: err instanceof Error ? err.message : String(err)
                });
                throw err;
            }
        }));
    });
    console.log(`📦 Dispatched ${workerPromises.length} independent model inferences to worker pool...`);
    // 4. AWAIT BATCH COMPLETION COHESIVELY
    const results = yield Promise.allSettled(workerPromises);
    results.forEach((result) => {
        if (result.status === 'fulfilled') {
            evaluationResults.push(result.value);
        }
    });
    const totalDurationMs = Date.now() - startTime;
    logger_1.logger.info('Inference processing batch completed successfully', {
        execution_id,
        duration_seconds: (totalDurationMs / 1000).toFixed(2),
        total_records_processed: evaluationResults.length
    });
    return {
        execution_id,
        results: evaluationResults
    };
});
exports.handler = handler;
// --- ISOLATED NETWORK WORKERS ---
function runDirectGeminiFlash(task) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = Date.now();
        try {
            const response = yield ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: task.prompt,
            });
            return {
                model_name: 'direct-gemini-2.5-flash',
                task_id: task.task_id,
                category: task.category,
                prompt: task.prompt,
                raw_output: response.text || '',
                ground_truth: task.dynamic_ground_truth,
                latency_ms: Date.now() - start
            };
        }
        catch (err) {
            logger_1.logger.warn('Direct Google AI Studio provider transaction failed exception fallback active', {
                task_id: task.task_id,
                error_message: err instanceof Error ? err.message : String(err)
            });
            return {
                model_name: 'direct-gemini-2.5-flash',
                task_id: task.task_id,
                category: task.category,
                prompt: task.prompt,
                raw_output: `Direct Gemini Error: ${err}`,
                ground_truth: task.dynamic_ground_truth,
                latency_ms: Date.now() - start
            };
        }
    });
}
function runOpenRouterModel(task, modelSlug) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const start = Date.now();
        try {
            const response = yield openrouter.chat.completions.create({
                model: modelSlug,
                messages: [{ role: 'user', content: task.prompt }],
                temperature: 0.2
            });
            const outputText = ((_c = (_b = (_a = response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '';
            if (!outputText)
                throw new Error('Empty API response choices returned.');
            return {
                model_name: modelSlug.replace(':free', ''),
                task_id: task.task_id,
                category: task.category,
                prompt: task.prompt,
                raw_output: outputText,
                ground_truth: task.dynamic_ground_truth,
                latency_ms: Date.now() - start
            };
        }
        catch (err) {
            logger_1.logger.warn('Open Router provider transaction failed exception fallback active', {
                task_id: task.task_id,
                error_message: err instanceof Error ? err.message : String(err)
            });
            return {
                model_name: modelSlug.replace(':free', ''),
                task_id: task.task_id,
                category: task.category,
                prompt: task.prompt,
                raw_output: `OpenRouter Error: ${err}`,
                ground_truth: task.dynamic_ground_truth,
                latency_ms: Date.now() - start
            };
        }
    });
}
