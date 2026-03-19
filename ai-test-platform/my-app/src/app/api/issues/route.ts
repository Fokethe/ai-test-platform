/**
 * Unified Issues API
 * 取代 Bug API
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { listResponse, createdResponse, errorResponse, errors, buildMeta } from "@/lib/api-response";
import { Prisma } from "@prisma/client";
import { parseJsonBody, buildQueryParams } from "@/lib/api-handler";
import { getPermissionManager } from "@/lib/knowledge/permission-manager";

// GET /api/issues
export async function GET(request: NextRequest) {
  try {
    // 添加权限验证
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const assigneeId = searchParams.get("assigneeId");
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);
    
    // 验证项目权限
    if (projectId) {
      const pm = getPermissionManager();
      const access = await pm.checkProjectAccess({ userId: session.user.id, projectId });
      if (!access.allowed) {
        return errors.forbidden(access.reason || "无项目访问权限");
      }
    }
    
    const where: Prisma.IssueWhereInput = {};
    if (projectId) where.projectId = projectId;
    if (type) where.type = type as Prisma.IssueWhereInput["type"];
    if (status) where.status = status as Prisma.IssueWhereInput["status"];
    if (severity) where.severity = severity as Prisma.IssueWhereInput["severity"];
    if (assigneeId) where.assigneeId = assigneeId;
    
    const total = await prisma.issue.count({ where });
    const issues = await prisma.issue.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        test: { select: { id: true, name: true } },
      },
    });
    
    return listResponse(issues, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error("Failed to fetch issues:", error);
    return errorResponse("获取问题列表失败");
  }
}

// POST /api/issues
export async function POST(request: NextRequest) {
  try {
    // 添加权限验证
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<{
      title: string;
      description?: string;
      type?: string;
      severity?: string;
      priority?: string;
      projectId: string;
      testId?: string;
      runId?: string;
    }>(request);
    
    if (!parseResult.success) {
      return parseResult.error;
    }
    
    const {
      title,
      description,
      type: issueType = "BUG",
      severity: issueSeverity = "MEDIUM",
      priority = "MEDIUM",
      projectId,
      testId,
      runId,
    } = parseResult.data;
    
    if (!title || !projectId) {
      return errors.badRequest("标题和项目ID不能为空");
    }
    
    // 验证项目权限
    const pm = getPermissionManager();
    const access = await pm.checkProjectAccess({ userId: session.user.id, projectId });
    if (!access.allowed) {
      return errors.forbidden(access.reason || "无项目访问权限");
    }
    
    // 需要编辑权限才能创建问题
    if (access.level < 2) {
      return errors.forbidden("需要编辑权限才能创建问题");
    }
    
    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        type: issueType as Prisma.IssueCreateInput["type"],
        severity: issueSeverity as Prisma.IssueCreateInput["severity"],
        priority,
        projectId,
        testId,
        runId,
        reporterId: session.user.id,
        status: "OPEN",
      },
    });
    
    return createdResponse(issue);
  } catch (error) {
    console.error("Failed to create issue:", error);
    return errorResponse("创建问题失败");
  }
}
