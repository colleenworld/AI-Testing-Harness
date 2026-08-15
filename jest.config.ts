/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.ts', '**/*.test.ts'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,

    // 1. FIXED: Tell Jest to run ts-jest over uncompiled node_modules code blocks
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.jsx?$': 'ts-jest'
    },

    // 2. FIXED: Whitelist p-limit and its nested queue framework dependencies
    transformIgnorePatterns: [
        'node_modules/(?!(p-limit|yocto-queue)/)'
    ],

    // 3. FIXED: Point code coverage tracking accurately to your local file layout
    collectCoverageFrom: [
        '**/*.ts',
        'lib/**/*.ts',
        '!**/*.test.ts',
        '!test/**', // Ignore files inside the test folder from being counted as source code
        '!types.ts',
        '!jest.config.js'
    ]
};