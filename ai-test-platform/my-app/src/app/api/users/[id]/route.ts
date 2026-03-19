import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { generateTempPassword } from '@/lib/security/password';
import { isUserRole, isUserStatus } from '@/lib/rbac';

async function sendPasswordResetEmail(email: string, userId: string): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Email] Password reset sent to ${email} (User ID: ${userId})`);
  }
}

async function ensureAdminAccess(targetId: string) {
  const session = await auth();
  if (!session?.user) {
    return { session, response: errors.unauthorized() };
  }

  if (session.user.role !== 'ADMIN') {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'FORBIDDEN_USER_MANAGEMENT',
      target: 'User',
      targetId,
      metadata: { role: session.user.role },
    });
    return { session, response: errors.forbidden() };
  }

  return { session, response: null as Response | null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const isAdmin = session.user.role === 'ADMIN';
  const isSelf = session.user.id === id;

  if (!isAdmin && !isSelf) {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'FORBIDDEN_USER_READ',
      target: 'User',
      targetId: id,
      metadata: { role: session.user.role },
    });
    return errors.forbidden();
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return errors.notFound('User');
  }

  return successResponse(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await ensureAdminAccess('update');
  if (response) {
    return response;
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const roleInput = (body as { role?: unknown })?.role;
  const statusInput = (body as { status?: unknown })?.status;
  const nameInput = (body as { name?: unknown })?.name;
  const resetPassword = Boolean((body as { resetPassword?: unknown })?.resetPassword);

  if (roleInput !== undefined && !isUserRole(roleInput)) {
    return errors.badRequest('Invalid role');
  }

  if (statusInput !== undefined && !isUserStatus(statusInput)) {
    return errors.badRequest('Invalid status');
  }

  const hasNameUpdate = typeof nameInput === 'string';
  if (
    roleInput === undefined &&
    statusInput === undefined &&
    !hasNameUpdate &&
    !resetPassword
  ) {
    return errors.badRequest('No valid fields to update');
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, status: true, name: true },
  });
  if (!existingUser) {
    return errors.notFound('User');
  }

  const updateData: {
    role?: 'ADMIN' | 'USER' | 'GUEST';
    status?: 'ACTIVE' | 'INACTIVE';
    name?: string;
    password?: string;
  } = {};
  if (roleInput !== undefined) {
    updateData.role = roleInput;
  }
  if (statusInput !== undefined) {
    updateData.status = statusInput;
  }
  if (hasNameUpdate) {
    updateData.name = (nameInput as string).trim();
  }

  if (resetPassword) {
    const tempPassword = generateTempPassword();
    updateData.password = await bcrypt.hash(tempPassword, 10);
    await sendPasswordResetEmail(existingUser.email, id);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const roleChanged = existingUser.role !== user.role;
  const statusChanged = existingUser.status !== user.status;
  if (roleChanged || statusChanged || resetPassword) {
    await writeAuditLog({
      actorId: session!.user.id,
      action: 'USER_ADMIN_UPDATED',
      target: 'User',
      targetId: user.id,
      metadata: {
        roleChanged,
        statusChanged,
        resetPassword,
        before: { role: existingUser.role, status: existingUser.status },
        after: { role: user.role, status: user.status },
      },
    });
  }

  return successResponse(user, 'User updated successfully');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await ensureAdminAccess('delete');
  if (response) {
    return response;
  }

  const { id } = await params;
  if (session!.user.id === id) {
    return errors.badRequest('Cannot delete current signed-in user');
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true },
  });
  if (!existingUser) {
    return errors.notFound('User');
  }

  await prisma.user.delete({
    where: { id },
  });

  await writeAuditLog({
    actorId: session!.user.id,
    action: 'USER_DELETED',
    target: 'User',
    targetId: id,
    metadata: { role: existingUser.role, status: existingUser.status },
  });

  return successResponse(null, 'User deleted successfully');
}
