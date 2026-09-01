"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const zod_1 = require("zod");
globals_1.jest.mock('../lib/dbPool');
const dbPool_1 = __importDefault(require("../lib/dbPool"));
// Cast the database instance into a Jest Mock type to cleanly read your .toHaveBeenCalled assertions
const mockedPool = dbPool_1.default;
const HydratedTaskSchema = zod_1.z.object({
    task_id: zod_1.z.string(),
    category: zod_1.z.string(),
    prompt: zod_1.z.string(),
    dynamic_ground_truth: zod_1.z.string()
});
// The core mapping algorithm from your hydrate logic pulled out for isolation
function mapTaskToLiveContext(task, liveWebContext) {
    if (!liveWebContext) {
        throw new Error('Hydration failed: Live search context is missing or null.');
    }
    return {
        task_id: task.task_id,
        category: task.category,
        prompt: task.prompt,
        dynamic_ground_truth: `[Verified Fact Context]: ${liveWebContext}`
    };
}
(0, globals_1.describe)('💧 Pipeline Dataset Hydration Engine Suite', () => {
    const mockRawTask = {
        task_id: 'task_test_99',
        category: 'Live Metrics',
        prompt: 'What happened to stock prices today?'
    };
    (0, globals_1.test)('✅ Should correctly stitch live web variables into the ground truth fields', () => {
        const mockSearchData = 'Market closed up 1.2% across major indexes.';
        const result = mapTaskToLiveContext(mockRawTask, mockSearchData);
        // Assert structure matches perfectly
        (0, globals_1.expect)(HydratedTaskSchema.safeParse(result).success).toBe(true);
        (0, globals_1.expect)(result.dynamic_ground_truth).toContain('Market closed up 1.2%');
    });
    (0, globals_1.test)('❌ Should throw an error if the live web context payload arrives empty or corrupt', () => {
        (0, globals_1.expect)(() => {
            mapTaskToLiveContext(mockRawTask, null);
        }).toThrow('Hydration failed');
    });
});
