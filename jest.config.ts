const { defineConfig } = require('jest');

module.exports = defineConfig({
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Enforces compilation for both TypeScript files and uncompiled node_modules code blocks
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.jsx?$': 'ts-jest'
    },
    // Tells Jest to find your test files inside your new root relative configuration structure
    testMatch: [
        '<rootDir>/src/test/**/*.test.ts'
    ],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    // Whitelist p-limit and its nested queue framework dependencies
    transformIgnorePatterns: [
        'node_modules/(?!(p-limit|yocto-queue)/)'
    ],
    // Secure your coverage collection tracking boundaries exactly relative to the root layout
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/test/**',
        '!<rootDir>/src/lib/types.ts',
        '!<rootDir>/jest.config.js'
    ]
});