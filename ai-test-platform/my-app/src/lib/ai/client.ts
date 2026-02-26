import OpenAI from 'openai';
import { GeneratePromptOptions, generatePrompt } from './prompts';
import { ModelConfig } from './model-manager';

// 创建OpenAI客户端的工厂函数
function createClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.KIMI_API_KEY || '';
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://api.moonshot.cn/v1',
  });
}

export interface GenerateOptions extends GeneratePromptOptions {
  model?: string;
  apiKey?: string;  // 用户传递的API Key
}

// ModelManager 使用的生成选项
export interface GenerateWithAIOptions {
  modelId?: string;
  config?: ModelConfig;
  timeout?: number;
}

/**
 * 通用 AI 生成函数（供 ModelManager 使用）
 * @param prompt - 提示词
 * @param options - 生成选项
 * @returns 生成的文本
 */
export async function generateWithAI(
  prompt: string,
  options: GenerateWithAIOptions = {}
): Promise<string> {
  const { modelId = 'kimi-k2.5', config, timeout = 30000 } = options;

  // 使用传入的 config 或环境变量
  const apiKey = config?.apiKey || process.env.KIMI_API_KEY || '';
  const baseURL = config?.baseUrl || 'https://api.moonshot.cn/v1';

  if (!apiKey) {
    throw new Error('未配置 API Key');
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout,
  });

  try {
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: '你是一位资深测试专家，擅长生成高质量的测试用例。请严格按照要求的JSON格式输出。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('[AI] API call failed:', error);
    throw new Error('AI 调用失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * 获取可用模型列表
 */
export async function getAvailableModels(): Promise<string[]> {
  // 暂时返回固定列表，后续可从 API 获取
  return ['kimi-k2.5', 'qwen-3', 'gpt-4', 'deepseek-v3'];
}

export async function generateTestCases(
  requirement: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { 
    model = 'moonshot-v1-8k', 
    temperature = 0.3,
    apiKey,
    ...promptOptions 
  } = options;

  // 生成prompt
  const prompt = generatePrompt(requirement, { ...promptOptions, temperature });

  // 检查是否有可用的API Key
  const hasApiKey = !!apiKey || !!process.env.KIMI_API_KEY;
  
  if (!hasApiKey) {
    console.log('[AI] No API Key configured, using enhanced mock data');
    await new Promise(resolve => setTimeout(resolve, 1500));
    return generateEnhancedMockData(requirement, promptOptions);
  }

  try {
    console.log('[AI] Calling Moonshot API with temperature:', temperature);
    const client = createClient(apiKey);
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位资深测试专家，擅长生成高质量的测试用例。请严格按照要求的JSON格式输出，用例必须真实反映用户需求。',
        },
        { role: 'user', content: prompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    console.log('[AI] API response received, length:', content?.length);
    return content || '';
  } catch (error) {
    console.error('[AI] API call failed:', error);
    console.log('[AI] Falling back to enhanced mock data');
    return generateEnhancedMockData(requirement, promptOptions);
  }
}

// 根据需求关键词生成更相关的模拟数据
function generateEnhancedMockData(
  requirement: string, 
  options: GeneratePromptOptions
): string {
  const { testCaseType = 'web', includePositive = true, includeNegative = true, includeBoundary = true } = options;
  
  // 分析需求关键词
  const keywords = extractKeywords(requirement);
  const featureName = keywords.feature || '功能';
  
  const testCases: any[] = [];
  
  // 根据类型生成不同的用例
  if (testCaseType === 'api') {
    if (includePositive) {
      testCases.push({
        title: `${featureName} - 正常请求`,
        preCondition: '接口可访问，参数格式正确',
        steps: ['构造有效请求参数', '发送请求', '验证响应'],
        expectation: '返回200状态码，数据正确',
        priority: 'P0',
        type: 'positive',
      });
    }
    if (includeNegative) {
      testCases.push(
        {
          title: `${featureName} - 缺少必填参数`,
          preCondition: '接口可访问',
          steps: ['构造缺少必填参数的请求', '发送请求'],
          expectation: '返回400错误，提示缺少参数',
          priority: 'P1',
          type: 'negative',
        },
        {
          title: `${featureName} - 无效Token鉴权失败`,
          preCondition: '使用无效或过期的Token',
          steps: ['构造带有无效Token的请求', '发送请求'],
          expectation: '返回401/403错误',
          priority: 'P1',
          type: 'negative',
        }
      );
    }
    if (includeBoundary) {
      testCases.push({
        title: `${featureName} - 参数边界值测试`,
        preCondition: '接口可访问',
        steps: ['构造参数边界值（最大/最小长度）', '发送请求'],
        expectation: '正确处理边界值',
        priority: 'P2',
        type: 'boundary',
      });
    }
  } else {
    // Web/APP 通用用例
    if (includePositive) {
      testCases.push({
        title: `${featureName} - 正常操作流程`,
        preCondition: '用户已登录，进入相关页面',
        steps: ['进入功能页面', '按正常流程操作', '提交'],
        expectation: '操作成功，提示正确',
        priority: 'P0',
        type: 'positive',
      });
    }
    if (includeNegative) {
      testCases.push(
        {
          title: `${featureName} - 无效输入处理`,
          preCondition: '进入功能页面',
          steps: ['输入无效/非法数据', '提交'],
          expectation: '提示输入错误，操作失败',
          priority: 'P1',
          type: 'negative',
        },
        {
          title: `${featureName} - 取消/返回操作`,
          preCondition: '进入操作页面',
          steps: ['开始操作', '中途取消或返回'],
          expectation: '操作取消，数据不保存',
          priority: 'P2',
          type: 'negative',
        }
      );
    }
    if (includeBoundary) {
      testCases.push({
        title: `${featureName} - 边界值测试`,
        preCondition: '进入功能页面',
        steps: ['输入边界值（最大/最小/空）', '提交'],
        expectation: '正确处理边界值',
        priority: 'P2',
        type: 'boundary',
      });
    }
  }
  
  // 根据需求中的具体点生成额外用例
  if (keywords.hasLength) {
    testCases.push({
      title: `${featureName} - 长度限制验证`,
      preCondition: '进入输入页面',
      steps: ['输入超过最大长度的内容', '提交'],
      expectation: '截断或提示超出长度限制',
      priority: 'P1',
      type: 'boundary',
    });
  }
  
  if (keywords.hasFormat) {
    testCases.push({
      title: `${featureName} - 格式验证`,
      preCondition: '进入输入页面',
      steps: ['输入格式不正确的数据', '提交'],
      expectation: '提示格式错误',
      priority: 'P1',
      type: 'negative',
    });
  }

  const suggestions = generateContextualSuggestions(keywords, testCaseType);

  return JSON.stringify({
    testCases,
    suggestions,
    isMock: true,
  });
}

// 提取需求关键词
function extractKeywords(requirement: string) {
  const text = requirement.toLowerCase();
  return {
    feature: text.match(/(登录|注册|订单|支付|搜索|上传|下载|删除|修改|查询|添加|创建|更新)/)?.[0] || '功能',
    hasLength: text.includes('长度') || text.includes('位') || /\d+-\d+/.test(text),
    hasFormat: text.includes('格式') || text.includes('邮箱') || text.includes('手机号') || text.includes('密码'),
    hasAuth: text.includes('登录') || text.includes('token') || text.includes('权限'),
    hasNetwork: text.includes('网络') || text.includes('wifi') || text.includes('离线'),
  };
}

// 生成上下文相关的建议
function generateContextualSuggestions(keywords: any, type: string): string[] {
  const suggestions: string[] = [];
  
  if (type === 'api') {
    suggestions.push('建议使用工具（如Postman）进行接口调试');
    suggestions.push('关注接口响应时间和性能指标');
  } else if (type === 'app') {
    suggestions.push('建议在不同机型和系统版本上测试');
    suggestions.push('关注弱网环境下的用户体验');
  } else {
    suggestions.push('建议在不同浏览器上测试兼容性');
    suggestions.push('关注响应式布局的适配');
  }
  
  if (keywords.hasAuth) {
    suggestions.push('建议进行安全测试，验证权限控制');
  }
  if (keywords.hasFormat) {
    suggestions.push('建议准备各种格式的测试数据');
  }
  
  return suggestions;
}

// 保持原有函数兼容
export function mockGenerateTestCases(): string {
  return generateEnhancedMockData('登录功能', { testCaseType: 'web' });
}
