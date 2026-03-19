
/**
 * 场景法工具
 * 基于用户故事生成测试场景（基本流、备选流、异常流）
 */

import { AbstractTool, ToolExecutionContext } from './abstract-tool';
import { JSONSchema } from '../types';

export interface ScenarioMethodInput {
  user_story: string;
  preconditions?: string[];
  steps?: string[];
}

export interface ScenarioMethodOutput {
  basic_flow: Array<{
    step_number: number;
    action: string;
    expected_result: string;
  }>;
  alternative_flows: Array<{
    name: string;
    trigger: string;
    steps: Array<{
      step_number: number;
      action: string;
      expected_result: string;
    }>;
  }>;
  exception_flows: Array<{
    name: string;
    trigger: string;
    steps: Array<{
      step_number: number;
      action: string;
      expected_result: string;
    }>;
  }>;
  test_scenarios: Array<{
    name: string;
    flow_type: 'basic' | 'alternative' | 'exception';
    steps: string[];
  }>;
}

export class ScenarioMethodTool extends AbstractTool {
  readonly name = 'generate_scenarios';
  readonly description = '基于用户故事生成测试场景';
  
  readonly inputSchema: JSONSchema = {
    type: 'object',
    description: '场景法工具输入参数',
    properties: {
      user_story: {
        type: 'string',
        description: '用户故事，如"作为用户，我可以登录系统"',
      },
      preconditions: {
        type: 'array',
        description: '前置条件',
        items: { type: 'string' },
      },
      steps: {
        type: 'array',
        description: '基本步骤（可选）',
        items: { type: 'string' },
      },
    },
    required: ['user_story'],
  };

  protected async executeInternal(
    input: unknown,
    _context: ToolExecutionContext
  ): Promise<ScenarioMethodOutput> {
    const { user_story, preconditions = [], steps } = input as ScenarioMethodInput;

    // 识别场景类型
    const scenarioType = this.detectScenarioType(user_story);

    // 生成基本流
    const basicFlow = steps && steps.length > 0
      ? this.generateFlowFromSteps(steps)
      : this.generateBasicFlow(scenarioType);

    // 生成备选流
    const alternativeFlows = this.generateAlternativeFlows(scenarioType, basicFlow);

    // 生成异常流
    const exceptionFlows = this.generateExceptionFlows(scenarioType, basicFlow);

    // 组合测试场景
    const testScenarios: ScenarioMethodOutput['test_scenarios'] = [
      {
        name: '基本流-正常完成',
        flow_type: 'basic',
        steps: basicFlow.map(s => s.action),
      },
      ...alternativeFlows.map(flow => ({
        name: `备选流-${flow.name}`,
        flow_type: 'alternative' as const,
        steps: flow.steps.map(s => s.action),
      })),
      ...exceptionFlows.map(flow => ({
        name: `异常流-${flow.name}`,
        flow_type: 'exception' as const,
        steps: flow.steps.map(s => s.action),
      })),
    ];

    return {
      basic_flow: basicFlow,
      alternative_flows: alternativeFlows,
      exception_flows: exceptionFlows,
      test_scenarios: testScenarios,
    };
  }

  private detectScenarioType(userStory: string): string {
    const lowerStory = userStory.toLowerCase();
    if (lowerStory.includes('登录')) return 'login';
    if (lowerStory.includes('注册') || lowerStory.includes('创建账号')) return 'register';
    if (lowerStory.includes('支付') || lowerStory.includes('购买')) return 'payment';
    if (lowerStory.includes('搜索') || lowerStory.includes('查询')) return 'search';
    if (lowerStory.includes('提交') || lowerStory.includes('保存')) return 'submit';
    return 'generic';
  }

  private generateFlowFromSteps(steps: string[]): ScenarioMethodOutput['basic_flow'] {
    return steps.map((step, index) => ({
      step_number: index + 1,
      action: step,
      expected_result: '执行成功',
    }));
  }

  private generateBasicFlow(type: string): ScenarioMethodOutput['basic_flow'] {
    const flows: Record<string, ScenarioMethodOutput['basic_flow']> = {
      login: [
        { step_number: 1, action: '输入用户名', expected_result: '用户名输入成功' },
        { step_number: 2, action: '输入密码', expected_result: '密码输入成功' },
        { step_number: 3, action: '点击登录按钮', expected_result: '登录成功，跳转到首页' },
      ],
      register: [
        { step_number: 1, action: '输入注册信息（用户名、密码、邮箱）', expected_result: '信息输入成功' },
        { step_number: 2, action: '阅读并同意用户协议', expected_result: '协议同意成功' },
        { step_number: 3, action: '点击注册按钮', expected_result: '注册成功，自动登录' },
      ],
      payment: [
        { step_number: 1, action: '选择商品并加入购物车', expected_result: '商品加入购物车成功' },
        { step_number: 2, action: '进入结算页面，确认订单信息', expected_result: '订单信息确认成功' },
        { step_number: 3, action: '选择支付方式并完成支付', expected_result: '支付成功，显示订单完成' },
      ],
      search: [
        { step_number: 1, action: '输入搜索关键词', expected_result: '关键词输入成功' },
        { step_number: 2, action: '点击搜索按钮', expected_result: '搜索结果正确显示' },
      ],
      generic: [
        { step_number: 1, action: '进入功能页面', expected_result: '页面加载成功' },
        { step_number: 2, action: '输入必要信息', expected_result: '信息输入成功' },
        { step_number: 3, action: '执行操作', expected_result: '操作执行成功' },
        { step_number: 4, action: '确认结果', expected_result: '结果正确' },
      ],
    };

    return flows[type] || flows.generic;
  }

  private generateAlternativeFlows(
    type: string,
    basicFlow: ScenarioMethodOutput['basic_flow']
  ): ScenarioMethodOutput['alternative_flows'] {
    const alternatives: Record<string, ScenarioMethodOutput['alternative_flows']> = {
      login: [
        {
          name: '记住密码登录',
          trigger: '用户选择记住密码',
          steps: [
            { step_number: 1, action: '输入用户名', expected_result: '用户名输入成功' },
            { step_number: 2, action: '输入密码并勾选"记住密码"', expected_result: '密码输入成功，记住密码选项已勾选' },
            { step_number: 3, action: '点击登录按钮', expected_result: '登录成功，下次自动填充密码' },
          ],
        },
        {
          name: '第三方账号登录',
          trigger: '用户选择第三方登录',
          steps: [
            { step_number: 1, action: '点击"使用微信登录"', expected_result: '跳转到微信授权页面' },
            { step_number: 2, action: '在微信端确认授权', expected_result: '授权成功，返回应用并登录' },
          ],
        },
      ],
      payment: [
        {
          name: '使用优惠券',
          trigger: '用户有可用优惠券',
          steps: [
            { step_number: 1, action: '选择商品并加入购物车', expected_result: '商品加入购物车成功' },
            { step_number: 2, action: '进入结算页面，选择使用优惠券', expected_result: '优惠券应用成功，金额更新' },
            { step_number: 3, action: '完成支付', expected_result: '支付成功（优惠后金额）' },
          ],
        },
      ],
      generic: [],
    };

    return alternatives[type] || alternatives.generic;
  }

  private generateExceptionFlows(
    type: string,
    basicFlow: ScenarioMethodOutput['basic_flow']
  ): ScenarioMethodOutput['exception_flows'] {
    const exceptions: Record<string, ScenarioMethodOutput['exception_flows']> = {
      login: [
        {
          name: '用户名不存在',
          trigger: '输入的用户名未注册',
          steps: [
            { step_number: 1, action: '输入不存在的用户名', expected_result: '用户名输入成功' },
            { step_number: 2, action: '输入密码', expected_result: '密码输入成功' },
            { step_number: 3, action: '点击登录按钮', expected_result: '提示"用户名或密码错误"' },
          ],
        },
        {
          name: '密码错误',
          trigger: '密码输入错误',
          steps: [
            { step_number: 1, action: '输入正确的用户名', expected_result: '用户名输入成功' },
            { step_number: 2, action: '输入错误的密码', expected_result: '密码输入成功' },
            { step_number: 3, action: '点击登录按钮', expected_result: '提示"用户名或密码错误"' },
          ],
        },
        {
          name: '账号被锁定',
          trigger: '连续多次登录失败',
          steps: [
            { step_number: 1, action: '输入被锁定的账号', expected_result: '用户名输入成功' },
            { step_number: 2, action: '输入密码', expected_result: '密码输入成功' },
            { step_number: 3, action: '点击登录按钮', expected_result: '提示"账号已被锁定，请联系客服"' },
          ],
        },
      ],
      register: [
        {
          name: '用户名已存在',
          trigger: '输入的用户名已被注册',
          steps: [
            { step_number: 1, action: '输入已存在的用户名', expected_result: '提示"用户名已存在"' },
          ],
        },
      ],
      payment: [
        {
          name: '余额不足',
          trigger: '账户余额不足以支付订单',
          steps: [
            { step_number: 1, action: '提交订单', expected_result: '订单提交成功' },
            { step_number: 2, action: '选择余额支付', expected_result: '提示"余额不足"' },
          ],
        },
      ],
      generic: [
        {
          name: '网络异常',
          trigger: '网络连接中断',
          steps: [
            { step_number: 1, action: '执行操作', expected_result: '提示"网络异常，请稍后重试"' },
          ],
        },
      ],
    };

    return exceptions[type] || exceptions.generic;
  }
}