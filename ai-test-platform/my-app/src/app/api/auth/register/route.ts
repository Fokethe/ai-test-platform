import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { errorResponse, successResponse } from '@/lib/api-response';
import { ensurePersonalWorkspace } from '@/lib/personal-workspace';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid JSON payload', 400);
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format', 400);
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return errorResponse('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: hashedPassword,
          role: 'USER',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      await ensurePersonalWorkspace(createdUser.id, {
        db: tx,
        nameHint: createdUser.name,
        email: createdUser.email,
      });

      return createdUser;
    });

    return successResponse(user, 'Registration successful');
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('Registration failed, please try again later', 500);
  }
}
