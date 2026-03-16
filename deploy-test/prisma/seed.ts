import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 创建示例用户
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  });
  console.log('Created user:', user.email);

  // ========== 示例 1: 电商系统 ==========
  const workspace1 = await prisma.workspace.upsert({
    where: { id: 'demo-workspace' },
    update: {},
    create: {
      id: 'demo-workspace',
      name: '🛒 示例工作空间 - 电商系统',
      description: '这是一个完整的电商系统测试项目，包含订单、商品、用户等模块',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  // 电商项目
  const project1 = await prisma.project.create({
    data: {
      name: '电商平台',
      description: 'B2C 电商平台，包含前台商城和后台管理系统',
      workspaceId: workspace1.id,
    },
  });

  // 订单系统
  const orderSystem = await prisma.system.create({
    data: {
      name: '订单管理系统',
      baseUrl: 'https://mall.example.com',
      projectId: project1.id,
    },
  });

  // 订单相关页面
  const orderListPage = await prisma.page.create({
    data: {
      name: '订单列表页',
      path: '/orders',
      systemId: orderSystem.id,
    },
  });

  const orderDetailPage = await prisma.page.create({
    data: {
      name: '订单详情页',
      path: '/orders/:id',
      systemId: orderSystem.id,
    },
  });

  // 创建订单相关用例
  await prisma.testCase.createMany({
    data: [
      {
        title: '按时间范围筛选订单',
        preCondition: '用户已登录，存在多个时间段的订单数据',
        steps: JSON.stringify([
          '进入订单列表页',
          '点击"时间筛选"下拉框',
          '选择"最近7天"',
          '点击"确定"按钮'
        ]),
        expectation: '列表只显示最近7天内创建的订单',
        priority: 'P0',
        tags: JSON.stringify(['筛选', '订单']),
        status: 'ACTIVE',
        pageId: orderListPage.id,
      },
      {
        title: '按订单状态筛选 - 待付款',
        preCondition: '用户已登录，存在不同状态的订单',
        steps: JSON.stringify([
          '进入订单列表页',
          '点击"状态筛选"',
          '选择"待付款"',
          '点击"确定"'
        ]),
        expectation: '只显示状态为"待付款"的订单',
        priority: 'P1',
        tags: JSON.stringify(['筛选', '状态']),
        status: 'ACTIVE',
        pageId: orderListPage.id,
      },
      {
        title: '查看订单详情',
        preCondition: '用户已登录，存在订单数据',
        steps: JSON.stringify([
          '进入订单列表页',
          '点击任意订单',
          '查看订单详情'
        ]),
        expectation: '正确显示订单的完整信息（商品、金额、状态等）',
        priority: 'P0',
        tags: JSON.stringify(['详情', '查看']),
        status: 'ACTIVE',
        pageId: orderDetailPage.id,
      },
      {
        title: '取消订单 - 正常流程',
        preCondition: '用户已登录，存在待付款订单',
        steps: JSON.stringify([
          '进入订单详情页',
          '点击"取消订单"按钮',
          '选择取消原因',
          '确认取消'
        ]),
        expectation: '订单状态变为"已取消"，显示取消成功提示',
        priority: 'P1',
        tags: JSON.stringify(['取消', '订单']),
        status: 'ACTIVE',
        pageId: orderDetailPage.id,
      },
    ],
  });

  // 用户系统
  const userSystem = await prisma.system.create({
    data: {
      name: '用户中心',
      baseUrl: 'https://mall.example.com',
      projectId: project1.id,
    },
  });

  const loginPage = await prisma.page.create({
    data: {
      name: '登录页',
      path: '/login',
      systemId: userSystem.id,
    },
  });

  const registerPage = await prisma.page.create({
    data: {
      name: '注册页',
      path: '/register',
      systemId: userSystem.id,
    },
  });

  // 用户相关用例
  await prisma.testCase.createMany({
    data: [
      {
        title: '正常登录流程',
        preCondition: '用户已注册，账号状态正常',
        steps: JSON.stringify([
          '访问登录页',
          '输入正确的邮箱和密码',
          '点击"登录"按钮'
        ]),
        expectation: '登录成功，跳转到首页',
        priority: 'P0',
        tags: JSON.stringify(['登录', '正向']),
        status: 'ACTIVE',
        pageId: loginPage.id,
      },
      {
        title: '登录 - 错误密码',
        preCondition: '用户已注册',
        steps: JSON.stringify([
          '访问登录页',
          '输入正确的邮箱和错误的密码',
          '点击"登录"按钮'
        ]),
        expectation: '显示"密码错误"提示，登录失败',
        priority: 'P1',
        tags: JSON.stringify(['登录', '反向']),
        status: 'ACTIVE',
        pageId: loginPage.id,
      },
      {
        title: '注册 - 正常流程',
        preCondition: '邮箱未被注册',
        steps: JSON.stringify([
          '访问注册页',
          '输入邮箱、密码、确认密码',
          '勾选用户协议',
          '点击"注册"按钮'
        ]),
        expectation: '注册成功，自动登录并跳转',
        priority: 'P0',
        tags: JSON.stringify(['注册', '正向']),
        status: 'ACTIVE',
        pageId: registerPage.id,
      },
      {
        title: '注册 - 密码强度不足',
        preCondition: '-',
        steps: JSON.stringify([
          '访问注册页',
          '输入邮箱和弱密码（如"123456"）',
          '点击"注册"按钮'
        ]),
        expectation: '提示"密码强度不足，请包含字母和数字"',
        priority: 'P1',
        tags: JSON.stringify(['注册', '边界']),
        status: 'ACTIVE',
        pageId: registerPage.id,
      },
    ],
  });

  // ========== 示例 2: SaaS 后台系统 ==========
  const workspace2 = await prisma.workspace.create({
    data: {
      name: '📊 示例 - SaaS 后台系统',
      description: '企业级 SaaS 平台后台管理系统',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'SaaS 管理后台',
      description: '包含用户管理、权限控制、数据分析等模块',
      workspaceId: workspace2.id,
    },
  });

  const adminSystem = await prisma.system.create({
    data: {
      name: '权限管理系统',
      baseUrl: 'https://admin.saas-example.com',
      projectId: project2.id,
    },
  });

  const rolePage = await prisma.page.create({
    data: {
      name: '角色管理页',
      path: '/admin/roles',
      systemId: adminSystem.id,
    },
  });

  // 添加一些用例
  await prisma.testCase.createMany({
    data: [
      {
        title: '创建新角色',
        preCondition: '管理员已登录',
        steps: JSON.stringify([
          '进入角色管理页',
          '点击"新建角色"',
          '输入角色名称和描述',
          '分配权限',
          '保存'
        ]),
        expectation: '角色创建成功，显示在角色列表中',
        priority: 'P0',
        tags: JSON.stringify(['角色', '创建']),
        status: 'ACTIVE',
        pageId: rolePage.id,
      },
      {
        title: '删除角色 - 有用户关联时',
        preCondition: '存在已分配用户的角色',
        steps: JSON.stringify([
          '进入角色管理页',
          '选择有用户的角色',
          '点击"删除"',
          '确认删除'
        ]),
        expectation: '提示"该角色有关联用户，无法删除"',
        priority: 'P1',
        tags: JSON.stringify(['角色', '删除', '边界']),
        status: 'ACTIVE',
        pageId: rolePage.id,
      },
    ],
  });

  // ========== 创建一些执行记录示例 ==========
  const testRun = await prisma.testRun.create({
    data: {
      name: '回归测试 - 2024-02-16',
      status: 'PASSED',
      browser: 'chromium',
      headless: true,
      totalCount: 4,
      passedCount: 4,
      failedCount: 0,
      createdBy: user.id,
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
    },
  });

  // 获取刚创建的用例
  const testCases = await prisma.testCase.findMany({
    where: { pageId: orderListPage.id },
    take: 2,
  });

  for (const tc of testCases) {
    await prisma.testExecution.create({
      data: {
        testCaseId: tc.id,
        runId: testRun.id,
        status: 'PASSED',
        duration: 1500 + Math.floor(Math.random() * 2000),
        logs: JSON.stringify([
          { step: 1, description: '进入页面', status: 'passed', duration: 500 },
          { step: 2, description: '执行操作', status: 'passed', duration: 800 },
          { step: 3, description: '验证结果', status: 'passed', duration: 400 },
        ]),
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(),
      },
    });
  }

  console.log('✅ Seeding finished successfully!');
  console.log(`
📊 创建的示例数据：
- 2 个工作空间
- 2 个项目  
- 4 个系统
- 5 个页面
- 14 个测试用例
- 1 个执行记录
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
