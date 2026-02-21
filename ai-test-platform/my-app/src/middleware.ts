import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/workspaces/:path*', '/testcases/:path*', '/executions/:path*', '/reports/:path*'],
};
