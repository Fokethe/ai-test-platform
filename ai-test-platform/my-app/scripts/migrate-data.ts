/**
 * 数据迁移脚本
 * 将旧模型数据迁移到新模型
 * 
 * 使用方法:
 *   npx tsx scripts/migrate-data.ts [--dry-run] [--force]
 * 
 * 选项:
 *   --dry-run  预览迁移，不实际写入数据
 *   --force    强制重新迁移（删除已有数据）
 */

import { prisma } from '../src/lib/prisma';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

interface MigrationResult {
  success: boolean;
  count: number;
  errors: string[];
}

async function migrateTestCasesToTests(): Promise<MigrationResult> {
  console.log('🔄 Migrating TestCases to Tests...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    // 检查是否已有数据
    const existingCount = await prisma.test.count();
    if (existingCount > 0 && !isForce) {
      console.log(`   ℹ️  Tests 表已有 ${existingCount} 条数据，跳过迁移（使用 --force 强制重新迁移）`);
      return result;
    }

    if (isForce && existingCount > 0) {
      console.log('   ⚠️  强制模式：清空现有 Tests 数据...');
      if (!isDryRun) {
        await prisma.test.deleteMany();
      }
    }
    
    const testCases = await prisma.testCase.findMany({
      include: { page: { include: { system: true } } }
    });
    
    for (const tc of testCases) {
      try {
        if (!isDryRun) {
          await prisma.test.create({
            data: {
              id: tc.id,
              name: tc.title,
              description: `${tc.preCondition || ''}\n\n预期结果: ${tc.expectation}`.trim(),
              type: 'CASE',
              status: tc.status === 'DEPRECATED' ? 'ARCHIVED' : tc.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
              content: tc.steps,
              parentId: null,
              // @ts-ignore - projectId 从 page.system 获取
              projectId: tc.page?.system?.projectId || '',
              tags: tc.tags,
              priority: tc.priority === 'P0' ? 'CRITICAL' : tc.priority === 'P1' ? 'HIGH' : tc.priority === 'P2' ? 'MEDIUM' : 'LOW',
              source: tc.isAiGenerated ? 'AI' : 'MANUAL',
              // @ts-ignore - createdBy 字段不存在于 TestCase
              createdBy: '',
              createdAt: tc.createdAt,
              updatedAt: tc.updatedAt,
            },
          });
        }
        result.count++;
      } catch (error) {
        const errorMsg = `TestCase ${tc.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} test cases${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate test cases:', error);
  }
  
  return result;
}

async function migrateTestSuitesToTests(): Promise<MigrationResult> {
  console.log('🔄 Migrating TestSuites to Tests...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    const suites = await prisma.testSuite.findMany();
    
    for (const suite of suites) {
      try {
        // 检查是否已存在
        const existing = await prisma.test.findUnique({ where: { id: suite.id } });
        if (existing) {
          console.log(`   ℹ️  Suite ${suite.id} 已存在，跳过`);
          continue;
        }

        if (!isDryRun) {
          // 创建 Suite
          await prisma.test.create({
            data: {
              id: suite.id,
              name: suite.name,
              description: suite.description,
              type: 'SUITE',
              status: 'ACTIVE',
              projectId: suite.projectId,
              priority: 'MEDIUM',
              source: 'MANUAL',
              // @ts-ignore - createdBy 字段不存在于 TestSuite
              createdBy: '',
              createdAt: suite.createdAt,
              updatedAt: suite.updatedAt,
            },
          });
          
          // 迁移 Suite 中的 TestCase 关系
          // @ts-ignore - suiteId 字段可能在 Prisma 类型中不存在
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
        result.count++;
      } catch (error) {
        const errorMsg = `Suite ${suite.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} test suites`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate test suites:', error);
  }
  
  return result;
}

async function migrateTestRunsToRuns(): Promise<MigrationResult> {
  console.log('🔄 Migrating TestRuns to Runs...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    const runs = await prisma.testRun.findMany();
    
    for (const run of runs) {
      try {
        // 检查是否已存在
        const existing = await prisma.run.findUnique({ where: { id: run.id } });
        if (existing) {
          continue;
        }

        if (!isDryRun) {
          // 获取执行详情
          const executions = await prisma.testExecution.findMany({
            where: { runId: run.id },
          });
          
          // 映射 status
          const statusMap: Record<string, string> = {
            'PENDING': 'PENDING',
            'RUNNING': 'RUNNING',
            'PASSED': 'COMPLETED',
            'FAILED': 'FAILED',
            'CANCELLED': 'CANCELLED',
            'TIMEOUT': 'FAILED',
          };
          
          await prisma.run.create({
            data: {
              id: run.id,
              name: run.name || `执行 ${new Date(run.createdAt).toLocaleString()}`,
              type: 'MANUAL',
              status: (statusMap[run.status] || 'PENDING') as any,
              totalCount: run.totalCount,
              passedCount: run.passedCount,
              failedCount: run.failedCount,
              skippedCount: 0,
              duration: run.duration || undefined,
              createdBy: run.createdBy,
              startedAt: run.startedAt,
              completedAt: run.completedAt,
              createdAt: run.createdAt,
              executions: {
                create: executions.map(e => {
                  const execStatusMap: Record<string, string> = {
                    'PENDING': 'PENDING',
                    'RUNNING': 'RUNNING',
                    'PASSED': 'PASSED',
                    'FAILED': 'FAILED',
                    'CANCELLED': 'SKIPPED',
                    'TIMEOUT': 'ERROR',
                  };
                  return {
                    id: e.id,
                    testId: e.testCaseId,
                    status: (execStatusMap[e.status] || 'PENDING') as any,
                    duration: e.duration || undefined,
                    errorMessage: e.errorMessage || undefined,
                    errorStack: e.errorStack || undefined,
                    screenshot: e.screenshots ? JSON.parse(e.screenshots)[0] : undefined,
                    video: e.videoUrl,
                    stdout: e.logs,
                    startedAt: e.startedAt,
                    completedAt: e.completedAt,
                  };
                }),
              },
            },
          });
        }
        result.count++;
      } catch (error) {
        const errorMsg = `Run ${run.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} test runs`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate test runs:', error);
  }
  
  return result;
}

async function migrateBugsToIssues(): Promise<MigrationResult> {
  console.log('🔄 Migrating Bugs to Issues...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    const bugs = await prisma.bug.findMany();
    
    for (const bug of bugs) {
      try {
        // 检查是否已存在
        const existing = await prisma.issue.findUnique({ where: { id: bug.id } });
        if (existing) {
          continue;
        }

        if (!isDryRun) {
          // 映射 status
          const statusMap: Record<string, string> = {
            'NEW': 'OPEN',
            'IN_PROGRESS': 'IN_PROGRESS',
            'FIXED': 'RESOLVED',
            'VERIFIED': 'CLOSED',
            'CLOSED': 'CLOSED',
          };
          
          await prisma.issue.create({
            data: {
              id: bug.id,
              title: bug.title,
              description: bug.description,
              type: 'BUG',
              severity: bug.severity,
              status: (statusMap[bug.status] || 'OPEN') as any,
              priority: bug.severity === 'CRITICAL' ? 'CRITICAL' : bug.severity === 'HIGH' ? 'HIGH' : bug.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
              projectId: bug.projectId,
              testId: bug.testCaseId,
              reporterId: bug.reporterId,
              assigneeId: bug.assigneeId,
              resolution: bug.status === 'FIXED' ? 'FIXED' : bug.status === 'CLOSED' ? 'WONT_FIX' : undefined,
              resolvedAt: bug.status === 'FIXED' || bug.status === 'CLOSED' ? new Date() : undefined,
              createdAt: bug.createdAt,
              updatedAt: bug.updatedAt,
            },
          });
        }
        result.count++;
      } catch (error) {
        const errorMsg = `Bug ${bug.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} bugs to issues`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate bugs:', error);
  }
  
  return result;
}

async function migrateKnowledgeToAssets(): Promise<MigrationResult> {
  console.log('🔄 Migrating Knowledge to Assets...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    const entries = await prisma.knowledgeEntry.findMany();
    
    for (const entry of entries) {
      try {
        // 检查是否已存在
        const existing = await prisma.asset.findUnique({ where: { id: entry.id } });
        if (existing) {
          continue;
        }

        if (!isDryRun) {
          await prisma.asset.create({
            data: {
              id: entry.id,
              title: entry.title,
              description: entry.category,
              type: 'DOC',
              content: entry.content,
              tags: entry.tags,
              projectId: '', // KnowledgeEntry 没有 projectId，需要手动指定或使用默认值
              createdBy: entry.authorId,
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt,
            },
          });
        }
        result.count++;
      } catch (error) {
        const errorMsg = `KnowledgeEntry ${entry.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} knowledge entries`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate knowledge entries:', error);
  }
  
  return result;
}

async function migratePagesToAssets(): Promise<MigrationResult> {
  console.log('🔄 Migrating Pages to Assets...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    const pages = await prisma.page.findMany({
      include: { system: true },
    });
    
    for (const page of pages) {
      try {
        // 检查是否已存在
        const existing = await prisma.asset.findUnique({ where: { id: page.id } });
        if (existing) {
          continue;
        }

        if (!isDryRun) {
          await prisma.asset.create({
            data: {
              id: page.id,
              title: page.name,
              description: `Path: ${page.path}`,
              type: 'PAGE',
              content: JSON.stringify({
                path: page.path,
              }),
              projectId: page.system?.projectId || '',
              createdBy: '', // Page 没有 createdBy
              createdAt: page.createdAt,
              updatedAt: page.updatedAt,
            },
          });
        }
        result.count++;
      } catch (error) {
        const errorMsg = `Page ${page.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} pages`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate pages:', error);
  }
  
  return result;
}

async function migrateWebhooksToIntegrations(): Promise<MigrationResult> {
  console.log('🔄 Migrating Webhooks to Integrations...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    const webhooks = await prisma.webhook.findMany();
    
    for (const wh of webhooks) {
      try {
        // 检查是否已存在
        const existing = await prisma.integration.findUnique({ where: { id: wh.id } });
        if (existing) {
          continue;
        }

        if (!isDryRun) {
          // 映射 provider 到 type
          const typeMap: Record<string, string> = {
            'github': 'GITHUB',
            'gitlab': 'GITLAB',
            'jenkins': 'JENKINS',
            'slack': 'SLACK',
            'dingtalk': 'DINGTALK',
          };
          
          await prisma.integration.create({
            data: {
              id: wh.id,
              name: wh.name,
              type: (typeMap[wh.provider.toLowerCase()] || 'CUSTOM') as any,
              provider: wh.provider,
              url: wh.url,
              secret: wh.secret,
              events: wh.config || '[]',
              isActive: wh.isActive,
              projectId: wh.projectId,
              createdBy: '', // Webhook 没有 createdBy
              createdAt: wh.createdAt,
              updatedAt: wh.updatedAt,
            },
          });
        }
        result.count++;
      } catch (error) {
        const errorMsg = `Webhook ${wh.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} webhooks`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate webhooks:', error);
  }
  
  return result;
}

async function migrateNotificationsToInbox(): Promise<MigrationResult> {
  console.log('🔄 Migrating Notifications to Inbox...');
  
  const result: MigrationResult = { success: true, count: 0, errors: [] };
  
  try {
    const notifications = await prisma.notification.findMany();
    
    for (const notif of notifications) {
      try {
        // 检查是否已存在
        const existing = await prisma.inbox.findUnique({ where: { id: notif.id } });
        if (existing) {
          continue;
        }

        if (!isDryRun) {
          // 映射 type
          const typeMap: Record<string, string> = {
            'SYSTEM': 'SYSTEM',
            'EXECUTION': 'ALERT',
            'INVITE': 'MENTION',
          };
          
          await prisma.inbox.create({
            data: {
              id: notif.id,
              userId: notif.userId,
              type: (typeMap[notif.type] || 'SYSTEM'),
              title: notif.title,
              content: notif.content,
              isRead: notif.read,
              createdAt: notif.createdAt,
            },
          });
        }
        result.count++;
      } catch (error) {
        const errorMsg = `Notification ${notif.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Migrated ${result.count} notifications`);
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    console.error('❌ Failed to migrate notifications:', error);
  }
  
  return result;
}

async function main() {
  console.log('🚀 Starting data migration...\n');
  
  if (isDryRun) {
    console.log('🏃 DRY RUN MODE: No data will be written\n');
  }
  
  const results: Record<string, MigrationResult> = {};
  
  try {
    results.testCases = await migrateTestCasesToTests();
    results.testSuites = await migrateTestSuitesToTests();
    results.testRuns = await migrateTestRunsToRuns();
    results.bugs = await migrateBugsToIssues();
    results.knowledge = await migrateKnowledgeToAssets();
    results.pages = await migratePagesToAssets();
    results.webhooks = await migrateWebhooksToIntegrations();
    results.notifications = await migrateNotificationsToInbox();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));
    
    let totalMigrated = 0;
    let totalErrors = 0;
    
    for (const [name, result] of Object.entries(results)) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${name}: ${result.count} migrated${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`);
      totalMigrated += result.count;
      totalErrors += result.errors.length;
    }
    
    console.log('='.repeat(50));
    console.log(`Total: ${totalMigrated} records migrated, ${totalErrors} errors`);
    
    if (isDryRun) {
      console.log('\n🏃 This was a dry run. No data was actually written.');
      console.log('   Remove --dry-run to perform the actual migration.');
    } else {
      console.log('\n✨ Migration completed successfully!');
    }
    
    if (totalErrors > 0) {
      console.log('\n⚠️  Some migrations had errors. Check the logs above for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
