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
exports.handler = handler;
const dbPool_1 = require("./lib/dbPool"); // ◄ Import the schema initializer
const logger_1 = require("./lib/logger");
function handler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        logger_1.logger.info('Received API Gateway query event profile context');
        try {
            // FIXED: Run cold-start migration check before attempting any SELECT statements
            yield (0, dbPool_1.initializeDatabaseSchema)();
            const category = ((_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.category) || 'All';
            let queryText = `
      SELECT id, task_id, category, prompt, raw_output, ground_truth,
             latency_ms, model_version, prompt_tokens, completion_tokens,
             total_tokens, calculated_cost_usd, parsed_metrics
      FROM evaluation_results
    `;
            const params = [];
            if (category !== 'All') {
                queryText += ' WHERE category = $1';
                params.push(category);
            }
            queryText += ' ORDER BY created_at ASC LIMIT 200';
            const dbResult = yield (0, dbPool_1.safeQuery)(queryText, params);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:3000'
                },
                body: JSON.stringify(dbResult.rows)
            };
        }
        catch (error) {
            logger_1.logger.error('API Handler failed to extract evaluation records:', { error: error.message });
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': 'http://localhost:3000' },
                body: JSON.stringify({ error: 'Internal Database Retrieval Failure' })
            };
        }
    });
}
