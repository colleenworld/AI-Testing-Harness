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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const runner_1 = require("../runner");
globals_1.jest.mock('@google/genai');
globals_1.jest.mock('openai');
(0, globals_1.describe)('🤖 Production Parallel Model Runner Suite', () => {
    (0, globals_1.test)('✅ Real handler should map tasks concurrently to mock providers', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockEvent = {
            execution_id: 'run-sync-test',
            hydrated_tasks: [
                {
                    task_id: 'task_1_01',
                    category: 'Testing',
                    prompt: 'Concurrence Test Prompt',
                    dynamic_ground_truth: 'Verified Ground Truth Context'
                }
            ]
        };
        const result = yield (0, runner_1.handler)(mockEvent, {}, () => { });
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.execution_id).toBe('run-sync-test');
        (0, globals_1.expect)(result.results.length).toBe(5); // Verifies all 5 concurrent streams succeed
        (0, globals_1.expect)(result.results[0].raw_output).not.toContain('Error placeholder');
    }));
});
