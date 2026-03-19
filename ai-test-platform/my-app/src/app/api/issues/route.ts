/**
 * Unified Issues API
 */
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  buildMeta,
  createdResponse,
  errorResponse,
  errors,
  listResponse,
} from "@/lib/api-response";
import { parseJsonBody, buildQueryParams } from "@/lib/api-handler";
import { getPermissionManager } from "@/lib/knowledge/permission-manager";

// GET /api/issues
export async function GET(request: NextRequest) {
  try {
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

    if (projectId) {
      const pm = getPermissionManager();
      const access = await pm.checkProjectAccess({ userId: session.user.id, projectId });
      if (!access.allowed) {
        return errors.forbidden();
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
    return errorResponse("Failed to fetch issues");
  }
}

// POST /api/issues
export async function POST(request: NextRequest) {
  try {
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
      return errors.badRequest("title and projectId are required");
    }

    const pm = getPermissionManager();
    const access = await pm.checkProjectAccess({ userId: session.user.id, projectId });
    if (!access.allowed) {
      return errors.forbidden();
    }

    if (access.level < 2) {
      return errors.forbidden();
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
    return errorResponse("Failed to create issue");
  }
}
