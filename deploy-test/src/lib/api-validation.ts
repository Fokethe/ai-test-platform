import { z } from 'zod';

// 通用分页参数
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

// Runs API 查询参数
export const RunsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  type: z.enum(['MANUAL', 'SCHEDULED', 'WEBHOOK', 'API']).optional(),
  ...PaginationSchema.shape,
});

// Issues API 查询参数
export const IssuesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  type: z.enum(['BUG', 'TASK', 'IMPROVEMENT', 'QUESTION']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  ...PaginationSchema.shape,
});

// Assets API 查询参数
export const AssetsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  type: z.enum(['DOC', 'PAGE', 'SNIPPET', 'FILE']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  search: z.string().optional(),
  ...PaginationSchema.shape,
});

// Tests API 查询参数
export const TestsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  type: z.enum(['CASE', 'SUITE', 'FOLDER']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  parentId: z.string().uuid().optional().nullable(),
  search: z.string().optional(),
  tags: z.string().optional(),
  ...PaginationSchema.shape,
});

// 通用 ID 参数
export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// 验证辅助函数
export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new Error(`参数验证失败: ${result.error.message}`);
  }
  return result.data;
}

// 类型导出
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type RunsQueryInput = z.infer<typeof RunsQuerySchema>;
export type IssuesQueryInput = z.infer<typeof IssuesQuerySchema>;
export type AssetsQueryInput = z.infer<typeof AssetsQuerySchema>;
export type TestsQueryInput = z.infer<typeof TestsQuerySchema>;
export type IdParamInput = z.infer<typeof IdParamSchema>;
