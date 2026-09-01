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
const genai_1 = require("@google/genai");
const dbPool_1 = __importDefault(require("./lib/dbPool"));
const zod_1 = require("zod");
const logger_1 = require("./lib/logger");
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const JudgeScoresSchema = zod_1.z.object({
    factuality: zod_1.z.number().int().min(1).max(5),
    citation: zod_1.z.number().int().min(1).max(5),
    formatting: zod_1.z.number().int().min(1).max(5)
});
const handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    const { execution_id, results } = event;
    logger_1.logger.info('Starting Batch Evaluation Execution', {
        execution_id,
    });
    try {
        const queryPromises = results.map((run) => __awaiter(void 0, void 0, void 0, function* () {
            const scores = yield evaluateOutput(run);
            const queryText = `
                INSERT INTO evaluation_runs (
                    execution_id, task_id, category, model_name, prompt, 
                    raw_output, ground_truth, score_factuality, 
                    score_citation, score_formatting, latency_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
            `;
            return dbPool_1.default.query(queryText, [
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
            ]);
        }));
        yield Promise.all(queryPromises);
        return { status: 'SUCCESS', count: results.length };
    }
    catch (err) {
        logger_1.logger.error('Database logging failure:', {
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
});
exports.handler = handler;
function evaluateOutput(run) {
    return __awaiter(this, void 0, void 0, function* () {
        const systemPrompt = `You are an expert QA evaluation engine. 
Grade the model's raw output against the provided ground truth.
You MUST output raw JSON text strictly containing these three keys: factuality, citation, formatting. 
The value for each key must be an integer score between 1 and 5. Do not include markdown code block syntax.`;
        try {
            const response = yield ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `${systemPrompt}\n\n[PROMPT]: ${run.prompt}\n\n[OUTPUT]: ${run.raw_output}\n\n[TRUTH]: ${run.ground_truth}`,
                config: { responseMimeType: 'application/json' }
            });
            const rawText = response.text || '';
            const sanitizedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedJson = JSON.parse(sanitizedJson);
            return JudgeScoresSchema.parse(parsedJson);
        }
        catch (err) {
            logger_1.logger.warn('Schema validation rejected LLM Output:', {
                taskId: run.task_id,
                error: err instanceof Error ? err.message : String(err)
            });
            return { factuality: 1, citation: 1, formatting: 1 };
        }
    });
}
