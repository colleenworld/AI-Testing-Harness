import stylistic from '@stylistic/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
    {
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    modules: true
                },
                ecmaVersion: 'latest',
                project: './base.json',
            }
        }
    },
    {
        ignores: [
            '.aws-sam/**',
            'coverage/**',
            'dist/**',
            'node_modules/**',
            'eslint.config.mjs',
            'jest.config.js'
        ]
    },
    {
        plugins: { '@stylistic': stylistic },
        files: [ 'src/**/*.ts' ],
        rules: {
            '@stylistic/indent': [ 'error', 2 ],
            '@stylistic/array-element-newline': [ 'error', 'consistent' ],
            '@stylistic/array-bracket-spacing': [ 'error', 'always' ],
            '@stylistic/brace-style': [ 'error', 'stroustrup' ],
            '@stylistic/dot-location': [ 'error', 'property' ],
            '@stylistic/object-curly-spacing': [ 'error', 'always' ],
            '@stylistic/no-multiple-empty-lines': [ 'error', { 'max': 1, 'maxEOF': 0 } ],
            '@stylistic/semi': [ 'error', 'never' ],
            '@stylistic/quotes': [ 'error', 'single' ]
        }
    }
]