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
exports.initializeDatabaseSchema = initializeDatabaseSchema;
exports.safeQuery = safeQuery;
const pg_1 = require("pg");
const logger_1 = require("./logger");
const schema_1 = require("./schema");
const poolSettings = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000
};
const pool = new pg_1.Pool(poolSettings);
let isSchemaInitialized = false;
function initializeDatabaseSchema() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.info('Checking and initializing PostgreSQL database tables...');
        try {
            yield safeQuery(schema_1.schema);
            logger_1.logger.info('Database schema migration baseline verified successfully.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize database schema migrating scripts:', { error: error.message });
            throw error;
        }
    });
}
function safeQuery(text, params) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isSchemaInitialized && process.env.NODE_ENV !== 'test') {
            try {
                logger_1.logger.info('Checking and initializing PostgreSQL database tables...');
                yield pool.query(schema_1.schema);
                isSchemaInitialized = true;
                logger_1.logger.info('PostgreSQL schema verification completed successfully.');
            }
            catch (error) {
                logger_1.logger.error('Failed to initialize database schema migrating scripts:', { error: error.message });
                throw error;
            }
        }
        return pool.query(text, params);
    });
}
exports.default = pool;
