import {jest} from "@jest/globals";

export const GoogleGenAI = jest.fn().mockImplementation(() => {
    return {
        models: {
            generateContent: jest.fn().mockImplementation((config: any) => {
                // If the judge invokes this, return a valid JSON string
                if (config?.responseMimeType === "application/json" || String(config).includes("json")) {
                    return Promise.resolve({ text: '{"factuality": 5, "citation": 5, "formatting": 5}' });
                }
                // Default fallback response text for standard runner inferences
                return Promise.resolve({ text: 'Mocked successful evaluation response text from direct Gemini' });
            })
        }
    };
});