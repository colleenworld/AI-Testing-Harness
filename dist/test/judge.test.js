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
const globals_1 = require("@jest/globals");
const judge_1 = require("../judge");
globals_1.jest.mock('@google/genai');
globals_1.jest.mock('../lib/dbPool');
const dbPool_1 = __importDefault(require("../lib/dbPool"));
const mockedPool = dbPool_1.default;
(0, globals_1.describe)('⚖️ Production LLM-as-a-Judge Handler Suite', () => {
    (0, globals_1.test)('✅ Real handler should process a clean data package successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockEvent = {
            execution_id: 'test-execution-123',
            results: [
                {
                    model_name: 'test-model',
                    task_id: 'task_1_01',
                    category: 'Temporal',
                    prompt: 'What happened today?',
                    raw_output: 'Sample text model response payload structure',
                    ground_truth: 'Verified Context',
                    latency_ms: 150
                }
            ]
        };
        const result = yield (0, judge_1.handler)(mockEvent, {}, () => { });
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.status).toBe('SUCCESS');
        (0, globals_1.expect)(mockedPool.query).toHaveBeenCalled();
    }));
});
