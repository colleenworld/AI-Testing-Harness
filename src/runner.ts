import { Handler } from 'aws-lambda';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const googleGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface EvalTask {
    task_id: string;
    category: string;
    prompt: string;
    dynamic_ground_truth: string;
}

interface RunnerEvent {
    execution_id: string;
    hydrated_tasks: EvalTask[];
}

interface ModelOutput {
    model_name: string;
    task_id: string;
    category: string;
    prompt: string;
    raw_output: string;
    ground_truth: string;
    latency_ms: number;
}

export const handler: Handler<RunnerEvent, any> = async (event) => {
    const { execution_id, hydrated_tasks } = event;
    const evaluationResults: ModelOutput[] = [];

    // 2. Loop Through All 50 Golden Tasks Sequentially or in Batches
    for (const task of hydrated_tasks) {
        console.log(`Processing Task ID: ${task.task_id} across the model grid...`);

        // Define our 4 targeted parallel execution contexts
        const inferencePromises = [
            runGPT4o(task),
            runClaude35(task),
            runGeminiPro(task),
            runLlama31Bedrock(task)
        ];

        // Execute all 4 model inferences completely in parallel
        const results = await Promise.allSettled(inferencePromises);

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                evaluationResults.push(result.value);
            } else {
                console.error(`Inference failure context: ${result.reason}`);
            }
        });
    }

    // 3. Return payload directly to serve as Input for the downstream JudgeFunction Step Function State
    return {
        execution_id,
        results: evaluationResults
    };
};

// --- API IMPLEMENTATION UTILITIES ---

async function runGPT4o(task: EvalTask): Promise<ModelOutput> {
    const start = Date.now();
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: task.prompt }],
        temperature: 0.1
    });
    return {
        model_name: 'gpt-4o',
        task_id: task.task_id,
        category: task.category,
        prompt: task.prompt,
        raw_output: response.choices[0].message.content || '',
        ground_truth: task.dynamic_ground_truth,
        latency_ms: Date.now() - start
    };
}

async function runClaude35(task: EvalTask): Promise<ModelOutput> {
    const start = Date.now();
    const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{ role: 'user', content: task.prompt }],
        temperature: 0.1
    });

    // Fallback parsing for Anthropic content blocks
    const textOutput = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
        model_name: 'claude-3-5-sonnet',
        task_id: task.task_id,
        category: task.category,
        prompt: task.prompt,
        raw_output: textOutput,
        ground_truth: task.dynamic_ground_truth,
        latency_ms: Date.now() - start
    };
}

async function runGeminiPro(task: EvalTask): Promise<ModelOutput> {
    const start = Date.now();

    // Pass the model name directly into the contents payload
    const response = await googleGenAI.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: task.prompt,
    });

    return {
        model_name: 'gemini-1.5-pro',
        task_id: task.task_id,
        category: task.category,
        prompt: task.prompt,
        raw_output: response.text || '',
        ground_truth: task.dynamic_ground_truth,
        latency_ms: Date.now() - start
    };
}

async function runLlama31Bedrock(task: EvalTask): Promise<ModelOutput> {
    const start = Date.now();

    // Structuring standard Meta Llama 3 invocation payload format
    const payload = {
        prompt: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${task.prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
        max_gen_len: 512,
        temperature: 0.1,
        top_p: 0.9
    };

    const command = new InvokeModelCommand({
        modelId: 'meta.llama3-1-8b-instruct-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
    });

    const response = await bedrock.send(command);
    const nativeResponseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
        model_name: 'llama-3-1-8b-instruct',
        task_id: task.task_id,
        category: task.category,
        prompt: task.prompt,
        raw_output: nativeResponseBody.generation || '',
        ground_truth: task.dynamic_ground_truth,
        latency_ms: Date.now() - start
    };
}