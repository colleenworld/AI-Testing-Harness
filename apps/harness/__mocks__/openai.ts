import { jest } from '@jest/globals';

const OpenAI = jest.fn().mockImplementation(() => {
    return {
        chat: {
            completions: {
                create: jest.fn().mockImplementation(() => {
                    return Promise.resolve({
                        choices: [{ message: { content: 'Mocked successful evaluation text out from OpenRouter' } }]
                    });
                })
            }
        }
    };
});

export default OpenAI;