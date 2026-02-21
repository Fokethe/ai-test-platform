import { chromium, Browser, Page } from 'playwright';
import { prisma } from '../prisma';

export interface RunConfig {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  timeout?: number;
  slowMo?: number;
}

export interface StepResult {
  step: number;
  description: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  screenshot?: string;
  error?: string;
}

export interface RunResult {
  status: 'passed' | 'failed' | 'timeout' | 'error';
  duration: number;
  steps: StepResult[];
  screenshot?: string;
  videoPath?: string;
  errorMessage?: string;
}

// 解析测试步骤并执行
export async function runTestCase(
  testCaseId: string,
  executionId: string,
  config: RunConfig = {}
): Promise<RunResult> {
  const {
    browser: browserType = 'chromium',
    headless = true,
    timeout = 30000,
    slowMo = 0,
  } = config;

  const startTime = Date.now();
  const steps: StepResult[] = [];

  try {
    // 获取测试用例
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        page: {
          include: {
            system: true,
          },
        },
      },
    });

    if (!testCase) {
      throw new Error('Test case not found');
    }

    // 解析步骤
    const stepDescriptions: string[] = JSON.parse(testCase.steps);
    const baseUrl = testCase.page.system.baseUrl;

    // 启动浏览器
    const browser = await chromium.launch({
      headless,
      slowMo,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: headless ? undefined : { dir: './videos/' },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(timeout);

    // 执行前置条件（如果有）
    if (testCase.preCondition) {
      // 前置条件通常是登录等准备操作
      // 这里简化处理，实际应该解析并执行
    }

    // 执行每个步骤
    for (let i = 0; i < stepDescriptions.length; i++) {
      const stepStart = Date.now();
      const stepDesc = stepDescriptions[i];

      try {
        // 解析并执行步骤
        await executeStep(page, stepDesc, baseUrl);

        steps.push({
          step: i + 1,
          description: stepDesc,
          status: 'passed',
          duration: Date.now() - stepStart,
        });
      } catch (error) {
        const screenshotBuffer = await page.screenshot();
        const screenshot = screenshotBuffer.toString('base64');
        
        steps.push({
          step: i + 1,
          description: stepDesc,
          status: 'failed',
          duration: Date.now() - stepStart,
          screenshot,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await browser.close();

        return {
          status: 'failed',
          duration: Date.now() - startTime,
          steps,
          screenshot,
          errorMessage: `Step ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    // 验证预期结果
    // 这里简化处理，实际应该验证页面状态

    await browser.close();

    return {
      status: 'passed',
      duration: Date.now() - startTime,
      steps,
    };
  } catch (error) {
    return {
      status: 'error',
      duration: Date.now() - startTime,
      steps,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 解析并执行单个步骤
async function executeStep(page: Page, stepDesc: string, baseUrl: string): Promise<void> {
  const lowerDesc = stepDesc.toLowerCase();

  // 打开页面
  if (lowerDesc.includes('打开') || lowerDesc.includes('进入') || lowerDesc.includes('访问')) {
    const urlMatch = stepDesc.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : baseUrl;
    await page.goto(url);
    return;
  }

  // 点击操作
  if (lowerDesc.includes('点击') || lowerDesc.includes('按下')) {
    const buttonText = extractText(stepDesc, ['点击', '按下']);
    if (buttonText) {
      // 尝试通过文本找到按钮
      await page.getByText(buttonText, { exact: false }).click();
    } else {
      // 尝试通用选择器
      await page.click('button');
    }
    return;
  }

  // 输入操作
  if (lowerDesc.includes('输入') || lowerDesc.includes('填写')) {
    const inputMatch = stepDesc.match(/输入["'](.+?)["']|填写["'](.+?)["']/);
    if (inputMatch) {
      const text = inputMatch[1] || inputMatch[2];
      // 找到输入框并输入
      await page.locator('input, textarea').first().fill(text);
    }
    return;
  }

  // 等待操作
  if (lowerDesc.includes('等待')) {
    const timeMatch = stepDesc.match(/(\d+)/);
    if (timeMatch) {
      await page.waitForTimeout(parseInt(timeMatch[1]) * 1000);
    } else {
      await page.waitForLoadState('networkidle');
    }
    return;
  }

  // 默认：等待页面稳定
  await page.waitForTimeout(500);
}

// 从文本中提取关键词
function extractText(text: string, keywords: string[]): string | null {
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      const after = text.slice(index + keyword.length).trim();
      // 提取引号内的内容或第一个名词
      const quoteMatch = after.match(/["'](.+?)["']/);
      if (quoteMatch) return quoteMatch[1];
      
      // 提取到下一个标点或空格
      const wordMatch = after.match(/^([^\s,，.。]+)/);
      if (wordMatch) return wordMatch[1];
    }
  }
  return null;
}
