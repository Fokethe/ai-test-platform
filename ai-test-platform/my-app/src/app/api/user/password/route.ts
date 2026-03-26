import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: {
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmPassword?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword =
    typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!currentPassword || !newPassword || !confirmPassword) {
    return errors.badRequest('All password fields are required');
  }

  if (newPassword !== confirmPassword) {
    return errors.badRequest('New password and confirmation do not match');
  }

  if (newPassword.length < 6) {
    return errors.badRequest('New password must be at least 6 characters');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });
  if (!user) {
    return errors.notFound('User');
  }
  if (!user.password) {
    return errors.badRequest('Password login is not enabled for this account');
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return errors.forbidden();
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return successResponse({ updated: true }, 'Password updated');
}
