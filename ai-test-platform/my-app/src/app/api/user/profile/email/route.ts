import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown };
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return errors.badRequest('email and password are required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return errors.badRequest('Invalid email format');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });
  if (!user) {
    return errors.notFound('User');
  }

  if (!user.password) {
    return errors.badRequest('Password verification is unavailable for this account');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return errors.forbidden();
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing && existing.id !== session.user.id) {
    return errors.conflict('Email already in use');
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      email,
      emailVerified: null,
    },
    select: { id: true, email: true },
  });

  return successResponse(updated, 'Email updated');
}
