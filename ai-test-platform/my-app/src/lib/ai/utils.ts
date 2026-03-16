import OpenAI from 'openai';
import { GeneratePromptOptions } from './prompts';

export interface AIClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface MockDataOptions extends GeneratePromptOptions {
  featureName?: string;
}

export interface VisionCallOptions {
  prompt: string;
  image: Buffer | string;
  model?: string;
  apiKey: string;
}

export interface TextCallOptions {
  prompt: string;
  model?: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
}

export function createAIClient(options: AIClientOptions = {}): OpenAI {
  const apiKey = options.apiKey || process.env.KIMI_API_KEY || '';
  const baseURL = options.baseUrl || 'https://api.moonshot.cn/v1';
  return new OpenAI({ apiKey, baseURL, timeout: options.timeout });
}

export function buildSystemPrompt(role: 'testExpert' | 'default'): string {
  const prompts = {
    testExpert: '你是一位资深测试专家，擅长生成高质量的测试用例。请严格按照要求的JSON格式输出，用例必须真实反映用户需求。',
    default: '你是一位资深测试专家，擅长生成高质量的测试用例。请严格按照要求的JSON格式输出。',
  };
  return prompts[role];
}

export async function handleVisionModel(options: VisionCallOptions): Promise<string> {
  const { prompt, image, model = 'qwen-vl-max', apiKey } = options;
  const imageUrl = image instanceof Buffer 
    ? `data:image/png;base64,${image.toString('base64')}`
    : image;
  
  const client = createAIClient({ apiKey });
  const response = await client.chat.completions.create({
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ] as any,
    }],
    temperature: 0.3,
  });
  
  return response.choices[0].message.content || '';
}

export async function handleTextModel(options: TextCallOptions): Promise<string> {
  const { prompt, model = 'kimi-k2.5', apiKey, systemPrompt, temperature = 0.3 } = options;
  const client = createAIClient({ apiKey, timeout: 30000 });
  
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt || buildSystemPrompt('default') },
      { role: 'user', content: prompt },
    ],
    temperature,
    response_format: { type: 'json_object' },
  });
  
  return response.choices[0].message.content || '';
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function logDebug(message: string, ...args: any[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[AI]', message, ...args);
  }
}

export function logError(message: string, error: unknown): void {
  console.error('[AI]', message + ':', error);
}
