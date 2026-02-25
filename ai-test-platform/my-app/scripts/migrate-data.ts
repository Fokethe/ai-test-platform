/**
 * 数据迁移脚本
 * 将旧模型数据迁移到新模型
 */

import { prisma } from '../src/lib/prisma';

async function migrateTestCasesToTests() {
  console.log('🔄 Migrating TestCases to Tests...');
  
  const testCases = await prisma.testCase.findMany();
  
  for (const tc of testCases) {
    await prisma.test.create({
      data: {
        id: tc.id,
        name: tc.name,
        description: tc.description,
        type: 'CASE',
        status: tc.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
        content: JSON.stringify({
          steps: tc.steps,
          expected: tc.expected,
          selector: tc.selector,
        }),
        parentId: null,
        projectId: tc.projectId,
        tags: tc.tags,
        priority: tc.priority,
        source: 'MANUAL',
        createdBy: tc.createdBy,
        assignedTo: tc.assignedTo,
        createdAt: tc.createdAt,
        updatedAt: tc.updatedAt,
      },
    });
  }
  
  console.log(`✅ Migrated ${testCases.length} test cases`);
}

async function migrateTestSuitesToTests() {
  console.log('🔄 Migrating TestSuites to Tests...');
  
  const suites = await prisma.testSuite.findMany();
  
  for (const suite of suites) {
    // 创建 Suite
    await prisma.test.create({
      data: {
        id: suite.id,
        name: suite.name,
        description: suite.description,
        type: 'SUITE',
        status: 'ACTIVE',
        content: JSON.stringify({
          config: suite.config,
        }),
        parentId: null,
        projectId: suite.projectId,
        tags: null,
        priority: 'MEDIUM',
        source: 'MANUAL',
        createdBy: suite.createdBy,
        createdAt: suite.createdAt,
        updatedAt: suite.updatedAt,
      },
    });
    
    // 迁移 Suite 中的 TestCase 关系
    const suiteCases = await prisma.testSuiteCase.findMany({
      where: { suiteId: suite.id },
    });
    
    for (const sc of suiteCases) {
      await prisma.test.update({
        where: { id: sc.testCaseId },
        data: { parentId: suite.id },
      });
    }
  }
  
  console.log(`✅ Migrated ${suites.length} test suites`);
}

async function migrateTestRunsToRuns() {
  console.log('🔄 Migrating TestRuns to Runs...');
  
  const runs = await prisma.testRun.findMany();
  
  for (const run of runs) {
    // 获取执行详情
    const executions = await prisma.testExecution.findMany({
      where: { runId: run.id },
    });
    
    await prisma.run.create({
      data: {
        id: run.id,
        name: run.name,
        description: run.description,
        type: 'MANUAL',
        status: run.status as any,
        totalCount: run.totalCount,
        passedCount: run.passedCount,
        failedCount: run.failedCount,
        skippedCount: run.skippedCount || 0,
        duration: run.duration,
        projectId: run.projectId,
        createdBy: run.createdBy,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        createdAt: run.createdAt,
        // 内嵌 executions
        executions: {
          create: executions.map(e => ({
            id: e.id,
            testId: e.testCaseId,
            status: e.status as any,
            duration: e.duration,
            errorMessage: e.errorMessage,
            errorStack: e.errorStack,
            screenshot: e.screenshot,
            video: e.video,
            stdout: e.stdout,
            stderr: e.stderr,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
          })),
        },
      },
    });
  }
  
  console.log(`✅ Migrated ${runs.length} test runs`);
}

async function migrateBugsToIssues() {
  console.log('🔄 Migrating Bugs to Issues...');
  
  const bugs = await prisma.bug.findMany();
  
  for (const bug of bugs) {
    await prisma.issue.create({
      data: {
        id: bug.id,
        title: bug.title,
        description: bug.description,
        type: 'BUG',
        severity: bug.severity,
        status: bug.status as any,
        priority: bug.severity, // 映射 severity 到 priority
        projectId: bug.projectId,
        testId: bug.testCaseId,
        reporterId: bug.reporterId,
        assigneeId: bug.assigneeId,
        resolution: bug.resolution,
        resolvedAt: bug.resolvedAt,
        createdAt: bug.createdAt,
        updatedAt: bug.updatedAt,
      },
    });
  }
  
  console.log(`✅ Migrated ${bugs.length} bugs to issues`);
}

async function migrateKnowledgeToAssets() {
  console.log('🔄 Migrating Knowledge to Assets...');
  
  const entries = await prisma.knowledgeEntry.findMany();
  
  for (const entry of entries) {
    await prisma.asset.create({
      data: {
        id: entry.id,
        title: entry.title,
        description: entry.description,
        type: 'DOC',
        content: entry.content,
        tags: entry.tags,
        projectId: entry.projectId,
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  }
  
  console.log(`✅ Migrated ${entries.length} knowledge entries`);
}

async function migratePagesToAssets() {
  console.log('🔄 Migrating Pages to Assets...');
  
  const pages = await prisma.page.findMany();
  
  for (const page of pages) {
    await prisma.asset.create({
      data: {
        id: page.id,
        title: page.name,
        description: page.description,
        type: 'PAGE',
        content: JSON.stringify({
          url: page.url,
          metadata: page.metadata,
        }),
        selector: page.selector,
        url: page.url,
        projectId: page.projectId,
        createdBy: page.createdBy,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      },
    });
  }
  
  console.log(`✅ Migrated ${pages.length} pages`);
}

async function migrateWebhooksToIntegrations() {
  console.log('🔄 Migrating Webhooks to Integrations...');
  
  const webhooks = await prisma.webhook.findMany();
  
  for (const wh of webhooks) {
    await prisma.integration.create({
      data: {
        id: wh.id,
        name: wh.name,
        type: wh.provider.toUpperCase() as any,
        provider: wh.provider,
        url: wh.url,
        secret: wh.secret,
        events: wh.events || '[]',
        isActive: wh.isActive,
        projectId: wh.projectId,
        createdBy: wh.createdBy,
        createdAt: wh.createdAt,
        updatedAt: wh.updatedAt,
      },
    });
  }
  
  console.log(`✅ Migrated ${webhooks.length} webhooks`);
}

async function migrateScheduledTasksToRuns() {
  console.log('🔄 Migrating ScheduledTasks to Runs schedule field...');
  
  // 定时任务作为特殊的 Run 模板，下次执行时创建
  console.log('⏭️  Scheduled tasks will be migrated when scheduler is initialized');
}

async function migrateNotificationsToInbox() {
  console.log('🔄 Migrating Notifications to Inbox...');
  
  const notifications = await prisma.notification.findMany();
  
  for (const notif of notifications) {
    await prisma.inbox.create({
      data: {
        id: notif.id,
        userId: notif.userId,
        type: notif.type as any,
        title: notif.title,
        content: notif.message,
        linkUrl: notif.link,
        linkText: notif.link ? '查看详情' : null,
        isRead: notif.isRead,
        readAt: notif.readAt,
        createdAt: notif.createdAt,
      },
    });
  }
  
  console.log(`✅ Migrated ${notifications.length} notifications`);
}

async function main() {
  console.log('🚀 Starting data migration...\n');
  
  try {
    await migrateTestCasesToTests();
    await migrateTestSuitesToTests();
    await migrateTestRunsToRuns();
    await migrateBugsToIssues();
    await migrateKnowledgeToAssets();
    await migratePagesToAssets();
    await migrateWebhooksToIntegrations();
    await migrateScheduledTasksToRuns();
    await migrateNotificationsToInbox();
    
    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
