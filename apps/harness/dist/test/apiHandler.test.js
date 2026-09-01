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
const apiHandler_1 = require("../apiHandler");
const dbPool_1 = __importDefault(require("../lib/__mocks__/dbPool"));
// Bind environmental credential variables before triggering execution suites
const VALID_TOKEN = 'secret-auth-token-123';
process.env.EXPECTED_API_KEY = VALID_TOKEN;
(0, globals_1.describe)('🧪 ApiHandler Security Validation Suites', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should reject requests with a 401 status if the X-Api-Key header is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const dummyEvent = {
            headers: {},
            queryStringParameters: { category: 'All' }
        };
        const result = yield (0, apiHandler_1.handler)(dummyEvent);
        (0, globals_1.expect)(result.statusCode).toBe(401);
        (0, globals_1.expect)(JSON.parse(result.body).error).toContain('Unauthorized');
        (0, globals_1.expect)(dbPool_1.default.safeQuery).not.toHaveBeenCalled();
    }));
    (0, globals_1.it)('should reject requests with a 401 status if the X-Api-Key is incorrect', () => __awaiter(void 0, void 0, void 0, function* () {
        const dummyEvent = {
            headers: { 'X-Api-Key': 'malicious-invalid-token' },
            queryStringParameters: { category: 'All' }
        };
        const result = yield (0, apiHandler_1.handler)(dummyEvent);
        (0, globals_1.expect)(result.statusCode).toBe(401);
        (0, globals_1.expect)(dbPool_1.default.safeQuery).not.toHaveBeenCalled();
    }));
    (0, globals_1.it)('should pass validation and return database rows when a valid X-Api-Key header is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockRows = [{ id: 1, task_id: 'task_01', category: 'Safety', prompt: 'Test' }];
        // @ts-ignore
        dbPool_1.default.safeQuery.mockResolvedValueOnce({ rows: mockRows });
        const dummyEvent = {
            headers: { 'x-api-key': VALID_TOKEN }, // Testing lower-case key fallback properties
            queryStringParameters: { category: 'Safety' }
        };
        const result = yield (0, apiHandler_1.handler)(dummyEvent);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual(mockRows);
        (0, globals_1.expect)(dbPool_1.default.safeQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('WHERE category = $1'), ['Safety']);
    }));
});
