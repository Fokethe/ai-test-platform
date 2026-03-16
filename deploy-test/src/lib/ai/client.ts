import { GeneratePromptOptions, generatePrompt } from './prompts';
import { ModelConfig } from './model-manager';
import {
  createAIClient,
  handleVisionModel,
  handleTextModel,
  buildSystemPrompt,
  delay,
  logDebug,
  logError,
} from './utils';

export interface GenerateOptions extends GeneratePromptOptions {
  model?: string;
  apiKey?: string;
}

export interface GenerateWithAIOptions {
  modelId?: string;
  config?: ModelConfig;
  timeout?: number;
}

export interface CallAIOptions {
  prompt: string;
  image?: Buffer | string;
  model?: string;
  apiKey?: string;
}

export async function generateWithAI(
  prompt: string,
  options: GenerateWithAIOptions = {}
): Promise<string> {
  const { modelId = 'kimi-k2.5', config, timeout = 30000 } = options;
  const apiKey = config?.apiKey || process.env.KIMI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('未配置 API Key');
  }

  try {
    return await handleTextModel({
      prompt,
      model: modelId,
      apiKey,
      systemPrompt: buildSystemPrompt('default'),
      temperature: 0.3,
    });
  } catch (error) {
    logError('API call failed', error);
    throw new Error('AI 调用失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

export async function generateTestCases(
  requirement: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { model = 'moonshot-v1-8k', temperature = 0.3, apiKey, ...promptOptions } = options;
  const prompt = generatePrompt(requirement, { ...promptOptions, temperature });
  
  const hasApiKey = !!apiKey || !!process.env.KIMI_API_KEY;
  
  if (!hasApiKey) {
    logDebug('No API Key configured, using mock data');
    await delay(1500);
    return mockGenerateTestCases();
  }

  try {
    logDebug('Calling Moonshot API with temperature:', temperature);
    const client = createAIClient({ apiKey });
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt('testExpert') },
        { role: 'user', content: prompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0].message.content;
    logDebug('API response received, length:', content?.length);
    return content || '';
  } catch (error) {
    logError('API call failed', error);
    logDebug('Falling back to mock data');
    return mockGenerateTestCases();
  }
}

export async function callAI(options: CallAIOptions): Promise<string> {
  const { prompt, image, model = 'qwen-vl', apiKey } = options;
  const key = apiKey || process.env.KIMI_API_KEY || '';
  
  if (!key) {
    throw new Error('未配置 API Key');
  }

  if (image) {
    logDebug('Calling vision model:', model);
    try {
      return await handleVisionModel({
        prompt,
        image,
        model: model === 'qwen-vl' ? 'qwen-vl-max' : model,
        apiKey: key,
      });
    } catch (error) {
      logError('Vision API call failed', error);
      return mockGenerateTestCases();
    }
  }

  return handleTextModel({ prompt, model, apiKey: key });
}

export async function getAvailableModels(): Promise<string[]> {
  return ['kimi-k2.5', 'qwen-3', 'gpt-4', 'deepseek-v3'];
}

export function mockGenerateTestCases(): string {
  return JSON.stringify({
    testCases: [
      {
        title: '登录功能 - 正常登录',
        preCondition: '用户已注册，进入登录页面',
        steps: ['输入正确的用户名和密码', '点击登录按钮'],
        expectation: '登录成功，跳转到首页',
        priority: 'P0',
        type: 'positive',
      },
      {
        title: '登录功能 - 密码错误',
        preCondition: '用户已注册，进入登录页面',
        steps: ['输入正确的用户名和错误的密码', '点击登录按钮'],
        expectation: '提示密码错误，登录失败',
        priority: 'P1',
        type: 'negative',
      },
    ],
    suggestions: ['建议使用不同浏览器测试', '关注登录响应时间'],
    isMock: true,
  });
}
