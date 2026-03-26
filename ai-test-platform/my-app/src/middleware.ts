import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_REDIRECTS: Record<string, (req: NextRequest) => string | null> = {
  '/api/testcases': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/tests';
    url.searchParams.set('type', 'CASE');
    return url.toString();
  },
  '/api/test-suites': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/tests';
    url.searchParams.set('type', 'SUITE');
    return url.toString();
  },
  '/api/test-runs': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/runs';
    return url.toString();
  },
  '/api/executions': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/runs';
    if (!url.searchParams.has('status')) {
      url.searchParams.set('status', 'RUNNING');
    }
    return url.toString();
  },
  '/api/bugs': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/issues';
    url.searchParams.set('type', 'BUG');
    return url.toString();
  },
  '/api/pages': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/assets';
    url.searchParams.set('type', 'PAGE');
    return url.toString();
  },
  '/api/webhooks': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/integrations';
    return url.toString();
  },
};

const PAGE_REDIRECTS: Record<string, string> = {
  '/testcases': '/tests',
  '/test-suites': '/tests?filter=suite',
  '/executions': '/runs',
  '/scheduled-tasks': '/runs?tab=scheduled',
  '/bugs': '/quality/issues',
  '/pages': '/assets/pages',
  '/webhooks': '/integrations',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const apiRedirect = API_REDIRECTS[pathname];
  if (apiRedirect) {
    const newUrl = apiRedirect(request);
    if (newUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.info(`[Middleware] API Redirect: ${pathname} -> ${newUrl}`);
      }
      return NextResponse.rewrite(new URL(newUrl));
    }
  }

  const pageRedirect = PAGE_REDIRECTS[pathname];
  if (pageRedirect) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Middleware] Page Redirect: ${pathname} -> ${pageRedirect}`);
    }
    return NextResponse.redirect(new URL(pageRedirect, request.url));
  }

  const testCaseMatch = pathname.match(/^\/api\/testcases\/(.+)$/);
  if (testCaseMatch) {
    const id = testCaseMatch[1];
    return NextResponse.rewrite(new URL(`/api/tests/${id}`, request.url));
  }

  const testSuiteMatch = pathname.match(/^\/api\/test-suites\/(.+)$/);
  if (testSuiteMatch) {
    const id = testSuiteMatch[1];
    return NextResponse.rewrite(new URL(`/api/tests/${id}`, request.url));
  }

  const testRunMatch = pathname.match(/^\/api\/test-runs\/(.+)$/);
  if (testRunMatch) {
    const id = testRunMatch[1];
    return NextResponse.rewrite(new URL(`/api/runs/${id}`, request.url));
  }

  const executionStatusMatch = pathname.match(/^\/api\/executions\/status$/);
  if (executionStatusMatch) {
    return NextResponse.rewrite(new URL('/api/runs?status=RUNNING', request.url));
  }

  const executionDetailMatch = pathname.match(/^\/api\/executions\/(.+)$/);
  if (executionDetailMatch) {
    const id = executionDetailMatch[1];
    return NextResponse.rewrite(new URL(`/api/runs/${id}`, request.url));
  }

  const bugMatch = pathname.match(/^\/api\/bugs\/(.+)$/);
  if (bugMatch) {
    const id = bugMatch[1];
    return NextResponse.rewrite(new URL(`/api/issues/${id}`, request.url));
  }

  const webhookMatch = pathname.match(/^\/api\/webhooks\/(.+)$/);
  if (webhookMatch) {
    const id = webhookMatch[1];
    return NextResponse.rewrite(new URL(`/api/integrations/${id}`, request.url));
  }

  const webhookDeliveriesMatch = pathname.match(/^\/api\/webhooks\/(.+)\/deliveries$/);
  if (webhookDeliveriesMatch) {
    const id = webhookDeliveriesMatch[1];
    return NextResponse.rewrite(new URL(`/api/integrations/${id}/deliveries`, request.url));
  }

  const testCasePageMatch = pathname.match(/^\/testcases\/(.+)$/);
  if (testCasePageMatch) {
    const rest = testCasePageMatch[1];
    return NextResponse.redirect(new URL(`/tests/${rest}`, request.url));
  }

  const bugPageMatch = pathname.match(/^\/bugs\/(.+)$/);
  if (bugPageMatch) {
    const rest = bugPageMatch[1];
    return NextResponse.redirect(new URL(`/quality/issues/${rest}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/testcases/:path*',
    '/api/test-suites/:path*',
    '/api/test-runs/:path*',
    '/api/executions/:path*',
    '/api/bugs/:path*',
    '/api/pages/:path*',
    '/api/webhooks/:path*',
    '/testcases/:path*',
    '/test-suites',
    '/executions',
    '/scheduled-tasks',
    '/bugs/:path*',
    '/pages',
    '/webhooks',
  ],
};
