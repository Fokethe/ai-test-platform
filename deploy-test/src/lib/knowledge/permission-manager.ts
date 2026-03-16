/**
 * Permission Manager
 * 知识库部门隔离权限管理器
 */

import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export enum PermissionLevel {
  NONE = 0,
  VIEW = 1,
  EDIT = 2,
  ADMIN = 3,
}

export enum KnowledgeRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

export interface AccessCheckInput {
  userId: string;
  departmentId: string;
  projectId?: string;
  knowledgeBaseId?: string;
}

export interface AclCheckInput {
  userId: string;
  resourceId: string;
  resourceType: 'knowledge_base' | 'document' | 'chunk';
  action: 'view' | 'edit' | 'delete' | 'admin';
}

export interface AccessDecision {
  allowed: boolean;
  level: PermissionLevel;
  reason?: string;
}

export interface PermissionResult {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAdmin: boolean;
  role?: KnowledgeRole;
}

export class PermissionManager {
  /**
   * 检查用户部门权限
   */
  async checkDepartmentAccess(input: AccessCheckInput): Promise<AccessDecision> {
    const { userId, departmentId } = input;

    // 查询用户部门成员关系
    const member = await prisma.departmentMember.findFirst({
      where: {
        userId,
        departmentId,
        status: 'ACTIVE',
      },
    });

    if (!member) {
      return {
        allowed: false,
        level: PermissionLevel.NONE,
        reason: '用户不属于该部门',
      };
    }

    // 根据角色确定权限级别
    const level = this.mapRoleToLevel(member.role as KnowledgeRole);

    return {
      allowed: level >= PermissionLevel.VIEW,
      level,
    };
  }

  /**
   * 检查项目权限
   */
  async checkProjectAccess(input: AccessCheckInput): Promise<AccessDecision> {
    const { userId, projectId } = input;

    if (!projectId) {
      return {
        allowed: false,
        level: PermissionLevel.NONE,
        reason: '未指定项目',
      };
    }

    // 查询用户项目成员关系
    const member = await prisma.projectMember.findFirst({
      where: {
        userId,
        projectId,
      },
    });

    if (!member) {
      return {
        allowed: false,
        level: PermissionLevel.NONE,
        reason: '用户不属于该项目',
      };
    }

    const level = this.mapRoleToLevel(member.role as KnowledgeRole);

    return {
      allowed: level >= PermissionLevel.VIEW,
      level,
    };
  }

  /**
   * 检查知识库ACL权限
   */
  async checkAcl(input: AclCheckInput): Promise<AccessDecision> {
    const { userId, resourceId, resourceType, action } = input;

    // 查询ACL记录
    const acl = await prisma.knowledgePermission.findFirst({
      where: {
        userId,
        resourceId,
        resourceType,
      },
    });

    if (!acl) {
      return {
        allowed: false,
        level: PermissionLevel.NONE,
        reason: '无ACL权限记录',
      };
    }

    // 检查权限是否过期
    if (acl.expiresAt && new Date() > acl.expiresAt) {
      return {
        allowed: false,
        level: PermissionLevel.NONE,
        reason: '权限已过期',
      };
    }

    // 验证操作权限
    const requiredLevel = this.mapActionToLevel(action);
    const userLevel = this.mapRoleToLevel(acl.role as KnowledgeRole);

    return {
      allowed: userLevel >= requiredLevel,
      level: userLevel,
    };
  }

  /**
   * 获取用户在知识库的完整权限
   */
  async getUserPermissions(
    userId: string,
    knowledgeBaseId: string
  ): Promise<PermissionResult> {
    // 查询知识库
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!kb) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canAdmin: false,
      };
    }

    // 检查部门权限
    const deptAccess = await this.checkDepartmentAccess({
      userId,
      departmentId: kb.departmentId,
      projectId: kb.projectId || undefined,
    });

    // 检查ACL权限
    const aclAccess = await this.checkAcl({
      userId,
      resourceId: knowledgeBaseId,
      resourceType: 'knowledge_base',
      action: 'view',
    });

    // 取最高权限
    const effectiveLevel = Math.max(deptAccess.level, aclAccess.level);

    return {
      canView: effectiveLevel >= PermissionLevel.VIEW,
      canEdit: effectiveLevel >= PermissionLevel.EDIT,
      canDelete: effectiveLevel >= PermissionLevel.ADMIN,
      canAdmin: effectiveLevel >= PermissionLevel.ADMIN,
      role: this.mapLevelToRole(effectiveLevel),
    };
  }

  /**
   * 验证NextAuth Session权限
   */
  async validateSession(
    session: Session | null,
    requiredDepartmentId?: string
  ): Promise<{ valid: boolean; userId?: string; error?: string }> {
    if (!session?.user?.id) {
      return { valid: false, error: '未登录' };
    }

    if (requiredDepartmentId) {
      const access = await this.checkDepartmentAccess({
        userId: session.user.id,
        departmentId: requiredDepartmentId,
      });

      if (!access.allowed) {
        return { valid: false, error: '无部门访问权限' };
      }
    }

    return { valid: true, userId: session.user.id };
  }

  /**
   * 授予ACL权限
   */
  async grantPermission(
    granterId: string,
    input: {
      userId: string;
      resourceId: string;
      resourceType: 'knowledge_base' | 'document' | 'chunk';
      role: KnowledgeRole;
      expiresAt?: Date;
    }
  ): Promise<boolean> {
    // 验证授予者权限
    const granterAccess = await this.checkAcl({
      userId: granterId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      action: 'admin',
    });

    if (!granterAccess.allowed) {
      return false;
    }

    // 创建或更新ACL
    await prisma.knowledgePermission.upsert({
      where: {
        userId_resourceId_resourceType: {
          userId: input.userId,
          resourceId: input.resourceId,
          resourceType: input.resourceType,
        },
      },
      update: {
        role: input.role,
        expiresAt: input.expiresAt,
        grantedBy: granterId,
      },
      create: {
        userId: input.userId,
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        role: input.role,
        expiresAt: input.expiresAt,
        grantedBy: granterId,
      },
    });

    return true;
  }

  /**
   * 撤销ACL权限
   */
  async revokePermission(
    revokerId: string,
    userId: string,
    resourceId: string,
    resourceType: 'knowledge_base' | 'document' | 'chunk'
  ): Promise<boolean> {
    // 验证撤销者权限
    const revokerAccess = await this.checkAcl({
      userId: revokerId,
      resourceId,
      resourceType,
      action: 'admin',
    });

    if (!revokerAccess.allowed) {
      return false;
    }

    await prisma.knowledgePermission.deleteMany({
      where: {
        userId,
        resourceId,
        resourceType,
      },
    });

    return true;
  }

  /**
   * 角色转权限级别
   */
  private mapRoleToLevel(role: KnowledgeRole): PermissionLevel {
    switch (role) {
      case KnowledgeRole.ADMIN:
        return PermissionLevel.ADMIN;
      case KnowledgeRole.EDITOR:
        return PermissionLevel.EDIT;
      case KnowledgeRole.VIEWER:
        return PermissionLevel.VIEW;
      default:
        return PermissionLevel.NONE;
    }
  }

  /**
   * 权限级别转角色
   */
  private mapLevelToRole(level: PermissionLevel): KnowledgeRole | undefined {
    switch (level) {
      case PermissionLevel.ADMIN:
        return KnowledgeRole.ADMIN;
      case PermissionLevel.EDIT:
        return KnowledgeRole.EDITOR;
      case PermissionLevel.VIEW:
        return KnowledgeRole.VIEWER;
      default:
        return undefined;
    }
  }

  /**
   * 操作转权限级别
   */
  private mapActionToLevel(action: string): PermissionLevel {
    switch (action) {
      case 'admin':
        return PermissionLevel.ADMIN;
      case 'delete':
        return PermissionLevel.ADMIN;
      case 'edit':
        return PermissionLevel.EDIT;
      case 'view':
        return PermissionLevel.VIEW;
      default:
        return PermissionLevel.NONE;
    }
  }
}

// 单例实例
let globalPermissionManager: PermissionManager | null = null;

export function getPermissionManager(): PermissionManager {
  if (!globalPermissionManager) {
    globalPermissionManager = new PermissionManager();
  }
  return globalPermissionManager;
}

export function resetPermissionManager(): void {
  globalPermissionManager = null;
}
