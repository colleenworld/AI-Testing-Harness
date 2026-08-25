"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDbQuery = void 0;
const globals_1 = require("@jest/globals");
exports.mockDbQuery = globals_1.jest.fn().mockImplementation(() => {
    return Promise.resolve({ rows: [] });
});
const poolMock = {
    query: exports.mockDbQuery,
    safeQuery: exports.mockDbQuery
};
exports.default = poolMock;
