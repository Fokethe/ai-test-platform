import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: 'ADMIN' | 'USER' | 'GUEST';
    };
  }

  interface User {
    id: string;
    role?: 'ADMIN' | 'USER' | 'GUEST';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'ADMIN' | 'USER' | 'GUEST';
  }
}
