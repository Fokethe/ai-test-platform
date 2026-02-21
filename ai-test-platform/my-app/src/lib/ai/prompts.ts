export interface GeneratePromptOptions {
  testCaseType?: 'web' | 'app' | 'api';
  includePositive?: boolean;
  includeNegative?: boolean;
  includeBoundary?: boolean;
  appPlatform?: 'ios' | 'android' | 'both';
  apiMethod?: string;
  apiEndpoint?: string;
  temperature?: number;
}

// 根据温度计算期望生成的用例数量
function getCaseCountByTemperature(temperature: number = 0.3): number {
  // 温度越低，生成数量越保守；温度越高，生成越多样
  if (temperature <= 0.3) return 3;
  if (temperature <= 0.5) return 5;
  if (temperature <= 0.7) return 7;
  return 10;
}

// 根据测试类型生成特定的系统提示
function getTypeSpecificPrompt(type: string): string {
  switch (type) {
    case 'api':
      return `
## API测试特定要求
1. 考虑接口的请求方法、参数、响应状态码
2. 包含参数校验（必填、格式、长度、类型）
3. 考虑鉴权失败场景（Token无效、过期、权限不足）
4. 考虑接口幂等性测试
5. 测试异常响应格式和错误码
6. 考虑并发请求场景`;
    case 'app':
      return `
## APP测试特定要求
1. 考虑移动端特性（横竖屏、手势操作、返回键）
2. 考虑网络环境（WiFi、4G、弱网、无网）
3. 考虑设备权限（相机、定位、通知、存储）
4. 考虑APP生命周期（后台切换、杀进程重启）
5. 考虑不同系统版本兼容性
6. 考虑电量、内存不足等系统限制场景`;
    case 'web':
    default:
      return `
## Web测试特定要求
1. 考虑浏览器兼容性（Chrome、Firefox、Safari、Edge）
2. 考虑响应式布局（桌面、平板、手机）
3. 考虑前端交互（点击、输入、拖拽、快捷键）
4. 考虑页面性能（加载速度、渲染）
5. 考虑安全（XSS、CSRF、SQL注入防护）
6. 考虑SEO和可访问性`;
  }
}

export function generatePrompt(
  requirement: string, 
  options: GeneratePromptOptions = {}
): string {
  const {
    testCaseType = 'web',
    includePositive = true,
    includeNegative = true,
    includeBoundary = true,
    appPlatform = 'both',
    apiMethod = 'GET',
    apiEndpoint = '',
    temperature = 0.3,
  } = options;

  const caseCount = getCaseCountByTemperature(temperature);
  const typePrompt = getTypeSpecificPrompt(testCaseType);

  const testTypes: string[] = [];
  if (includePositive) testTypes.push('正向用例（positive）');
  if (includeNegative) testTypes.push('反向用例（negative）');
  if (includeBoundary) testTypes.push('边界用例（boundary）');

  const platformInfo = testCaseType === 'app' 
    ? `\n目标平台: ${appPlatform === 'both' ? 'iOS 和 Android' : appPlatform.toUpperCase()}`
    : '';
  
  const apiInfo = testCaseType === 'api' && apiEndpoint
    ? `\nAPI端点: ${apiMethod} ${apiEndpoint}`
    : '';

  return `你是一位资深测试专家，请根据以下需求生成高质量的测试用例。

## 需求描述
${requirement}${platformInfo}${apiInfo}

## 生成要求
1. 生成约 ${caseCount} 条测试用例（根据需求复杂度可适当调整）
2. 必须覆盖以下类型: ${testTypes.join('、')}
3. 每条用例必须真实反映需求中的功能点
4. 不要生成与需求无关的通用用例
5. 用例标题要具体，能一眼看出测试点
6. 步骤要清晰可执行，预期结果要可验证
${typePrompt}

## 优先级定义
- P0: 核心功能、主流程，阻塞性问题
- P1: 重要功能、常用场景
- P2: 一般功能、次要场景
- P3: 边缘场景、异常处理

## 输出格式 (严格JSON)
{
  "testCases": [
    {
      "title": "具体描述测试点的标题",
      "preCondition": "执行测试前必须满足的条件",
      "steps": ["详细步骤1", "详细步骤2", "..."],
      "expectation": "明确的预期结果，可验证",
      "priority": "P0/P1/P2/P3",
      "type": "positive/negative/boundary"
    }
  ],
  "suggestions": [
    "基于需求的具体测试建议，如考虑的特殊场景、需要关注的风险点等"
  ]
}

## 重要提示
1. 用例必须严格基于用户输入的需求，不要生成与需求无关的内容
2. 如果需求提到具体功能点，每个功能点都要有对应用例
3. 考虑需求的边界条件和异常情况
4. 建议要具体，针对该需求的特点给出`;
}

// 生成AI建议的专用prompt
export function generateSuggestionsPrompt(requirement: string, testCaseType: string): string {
  return `作为测试专家，请针对以下需求给出测试建议：

需求: ${requirement}
测试类型: ${testCaseType.toUpperCase()}

请给出3-5条具体的测试建议，包括：
1. 可能遗漏的测试场景
2. 需要特别关注的风险点
3. 性能/安全方面的建议
4. 测试数据准备的建议

输出JSON格式: {"suggestions": ["建议1", "建议2", ...]}`;
}
