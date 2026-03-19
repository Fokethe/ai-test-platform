/**
 * Permission Manager - Fixed
 */
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export enum PermissionLevel { NONE = 0, VIEW = 1, EDIT = 2, ADMIN = 3 }
export enum KnowledgeRole { VIEWER = "VIEWER", EDITOR = "EDITOR", ADMIN = "ADMIN" }

export interface AccessCheckInput { userId: string; departmentId?: string; projectId?: string; }
export interface AclCheckInput { userId: string; resourceId: string; resourceType: string; action: string; }
export interface AccessDecision { allowed: boolean; level: PermissionLevel; reason?: string; }
export interface PermissionResult { canView: boolean; canEdit: boolean; canDelete: boolean; canAdmin: boolean; role?: KnowledgeRole; }

export class PermissionManager {
  async checkDepartmentAccess(input: AccessCheckInput): Promise<AccessDecision> {
    const { userId, departmentId } = input;
    if (!departmentId) return { allowed: true, level: PermissionLevel.VIEW };
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role === "ADMIN") return { allowed: true, level: PermissionLevel.ADMIN };
      const member = await prisma.workspaceMember.findFirst({ where: { userId, workspace: { departments: { some: { id: departmentId } } } } });
      if (member) {
        const level = member.role === "ADMIN" ? PermissionLevel.ADMIN : member.role === "EDITOR" ? PermissionLevel.EDIT : PermissionLevel.VIEW;
        return { allowed: true, level };
      }
      return { allowed: false, level: PermissionLevel.NONE, reason: "用户不属于该部门" };
    } catch (e) { return { allowed: false, level: PermissionLevel.NONE, reason: "权限检查失败" }; }
  }

  async checkProjectAccess(input: AccessCheckInput): Promise<AccessDecision> {
    const { userId, projectId } = input;
    if (!projectId) return { allowed: false, level: PermissionLevel.NONE, reason: "未指定项目" };
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role === "ADMIN") return { allowed: true, level: PermissionLevel.ADMIN };
      const member = await prisma.workspaceMember.findFirst({ where: { userId, workspace: { projects: { some: { id: projectId } } } } });
      if (member) {
        const level = member.role === "ADMIN" ? PermissionLevel.ADMIN : member.role === "EDITOR" ? PermissionLevel.EDIT : PermissionLevel.VIEW;
        return { allowed: true, level };
      }
      return { allowed: false, level: PermissionLevel.NONE, reason: "用户不是项目成员" };
    } catch (e) { return { allowed: false, level: PermissionLevel.NONE, reason: "权限检查失败" }; }
  }

  async checkAcl(input: AclCheckInput): Promise<AccessDecision> {
    const { userId, resourceId, resourceType, action } = input;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role === "ADMIN") return { allowed: true, level: PermissionLevel.ADMIN };
      if (resourceType === "knowledge_base") return await this.checkKnowledgeBaseAccess(userId, resourceId, action);
      return { allowed: false, level: PermissionLevel.NONE, reason: "未知资源类型" };
    } catch (e) { return { allowed: false, level: PermissionLevel.NONE, reason: "权限检查失败" }; }
  }

  private async checkKnowledgeBaseAccess(userId: string, kbId: string, action: string): Promise<AccessDecision> {
    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId }, include: { project: { include: { workspace: { include: { members: { where: { userId } } } } } } } });
    if (!kb) return { allowed: false, level: PermissionLevel.NONE, reason: "知识库不存在" };
    const member = kb.project?.workspace?.members[0];
    if (!member) return { allowed: false, level: PermissionLevel.NONE, reason: "无访问权限" };
    const reqLevel = action === "view" ? PermissionLevel.VIEW : action === "edit" ? PermissionLevel.EDIT : PermissionLevel.ADMIN;
    const userLevel = member.role === "ADMIN" ? PermissionLevel.ADMIN : member.role === "EDITOR" ? PermissionLevel.EDIT : PermissionLevel.VIEW;
    return userLevel >= reqLevel ? { allowed: true, level: userLevel } : { allowed: false, level: userLevel, reason: "权限不足" };
  }

  async getUserPermissions(userId: string, kbId: string): Promise<PermissionResult> {
    try {
      const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId }, include: { project: { include: { workspace: { include: { members: { where: { userId } } } } } } } });
      if (!kb) return { canView: false, canEdit: false, canDelete: false, canAdmin: false };
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role === "ADMIN") return { canView: true, canEdit: true, canDelete: true, canAdmin: true, role: KnowledgeRole.ADMIN };
      const member = kb.project?.workspace?.members[0];
      if (!member) return { canView: false, canEdit: false, canDelete: false, canAdmin: false };
      const role = member.role as KnowledgeRole;
      return { canView: true, canEdit: role === KnowledgeRole.EDITOR || role === KnowledgeRole.ADMIN, canDelete: role === KnowledgeRole.ADMIN, canAdmin: role === KnowledgeRole.ADMIN, role };
    } catch (e) { return { canView: false, canEdit: false, canDelete: false, canAdmin: false }; }
  }

  async validateSession(session: Session | null, deptId?: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    if (!session?.user?.id) return { valid: false, error: "未登录" };
    if (deptId) {
      const access = await this.checkDepartmentAccess({ userId: session.user.id, departmentId: deptId });
      if (!access.allowed) return { valid: false, error: access.reason || "无部门访问权限" };
    }
    return { valid: true, userId: session.user.id };
  }
}

let pm: PermissionManager | null = null;
export function getPermissionManager(): PermissionManager {
  if (!pm) pm = new PermissionManager();
  return pm;
}
