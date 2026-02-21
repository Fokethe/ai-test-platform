import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with query logging in development
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development') {
    // @ts-expect-error - Prisma middleware for timing queries
    client.$on('query', (e: { query: string; params: string; duration: number }) => {
      if (e.duration > 100) {
        console.warn(`[Slow Query] ${e.duration}ms: ${e.query}`);
      }
    });
  }

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
