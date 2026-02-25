/**
 * API Redirect Middleware
 * 处理旧 API 路由重定向到新路由
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// API 路由重定向映射
const API_REDIRECTS: Record<string, (req: NextRequest) => string | null> = {
  // Test APIs
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
  
  // Run APIs
  '/api/test-runs': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/runs';
    return url.toString();
  },
  '/api/executions': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/runs';
    // executions 通常是运行中的
    if (!url.searchParams.has('status')) {
      url.searchParams.set('status', 'RUNNING');
    }
    return url.toString();
  },
  
  // Issue APIs (旧 Bug)
  '/api/bugs': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/issues';
    url.searchParams.set('type', 'BUG');
    return url.toString();
  },
  
  // Asset APIs
  '/api/knowledge': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/assets';
    url.searchParams.set('type', 'DOC');
    return url.toString();
  },
  '/api/pages': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/assets';
    url.searchParams.set('type', 'PAGE');
    return url.toString();
  },
  
  // Integration APIs
  '/api/webhooks': (req) => {
    const url = req.nextUrl.clone();
    url.pathname = '/api/integrations';
    return url.toString();
  },
};

// 页面路由重定向映射
const PAGE_REDIRECTS: Record<string, string> = {
  '/testcases': '/tests',
  '/test-suites': '/tests?filter=suite',
  '/executions': '/runs',
  '/scheduled-tasks': '/runs?tab=scheduled',
  '/bugs': '/quality/issues',
  '/reports': '/quality/reports',
  '/knowledge': '/assets/docs',
  '/pages': '/assets/pages',
  '/webhooks': '/integrations',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 检查 API 重定向
  const apiRedirect = API_REDIRECTS[pathname];
  if (apiRedirect) {
    const newUrl = apiRedirect(request);
    if (newUrl) {
      console.log(`[Middleware] API Redirect: ${pathname} -> ${newUrl}`);
      return NextResponse.rewrite(new URL(newUrl));
    }
  }

  // 2. 检查页面路由重定向
  const pageRedirect = PAGE_REDIRECTS[pathname];
  if (pageRedirect) {
    console.log(`[Middleware] Page Redirect: ${pathname} -> ${pageRedirect}`);
    return NextResponse.redirect(new URL(pageRedirect, request.url));
  }

  // 3. 动态路由重定向
  // /api/testcases/[id] -> /api/tests/[id]
  const testCaseMatch = pathname.match(/^\/api\/testcases\/(.+)$/);
  if (testCaseMatch) {
    const id = testCaseMatch[1];
    return NextResponse.rewrite(new URL(`/api/tests/${id}`, request.url));
  }

  // /api/test-suites/[id] -> /api/tests/[id]
  const testSuiteMatch = pathname.match(/^\/api\/test-suites\/(.+)$/);
  if (testSuiteMatch) {
    const id = testSuiteMatch[1];
    return NextResponse.rewrite(new URL(`/api/tests/${id}`, request.url));
  }

  // /api/test-runs/[id] -> /api/runs/[id]
  const testRunMatch = pathname.match(/^\/api\/test-runs\/(.+)$/);
  if (testRunMatch) {
    const id = testRunMatch[1];
    return NextResponse.rewrite(new URL(`/api/runs/${id}`, request.url));
  }

  // /api/bugs/[id] -> /api/issues/[id]
  const bugMatch = pathname.match(/^\/api\/bugs\/(.+)$/);
  if (bugMatch) {
    const id = bugMatch[1];
    return NextResponse.rewrite(new URL(`/api/issues/${id}`, request.url));
  }

  // /api/webhooks/[id] -> /api/integrations/[id]
  const webhookMatch = pathname.match(/^\/api\/webhooks\/(.+)$/);
  if (webhookMatch) {
    const id = webhookMatch[1];
    return NextResponse.rewrite(new URL(`/api/integrations/${id}`, request.url));
  }

  // /api/webhooks/[id]/deliveries -> /api/integrations/[id]/deliveries
  const webhookDeliveriesMatch = pathname.match(/^\/api\/webhooks\/(.+)\/deliveries$/);
  if (webhookDeliveriesMatch) {
    const id = webhookDeliveriesMatch[1];
    return NextResponse.rewrite(new URL(`/api/integrations/${id}/deliveries`, request.url));
  }

  // /testcases/* -> /tests/*
  const testCasePageMatch = pathname.match(/^\/testcases\/(.+)$/);
  if (testCasePageMatch) {
    const rest = testCasePageMatch[1];
    return NextResponse.redirect(new URL(`/tests/${rest}`, request.url));
  }

  // /bugs/* -> /quality/issues/*
  const bugPageMatch = pathname.match(/^\/bugs\/(.+)$/);
  if (bugPageMatch) {
    const rest = bugPageMatch[1];
    return NextResponse.redirect(new URL(`/quality/issues/${rest}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // API 路由
    '/api/testcases/:path*',
    '/api/test-suites/:path*',
    '/api/test-runs/:path*',
    '/api/executions/:path*',
    '/api/bugs/:path*',
    '/api/knowledge/:path*',
    '/api/pages/:path*',
    '/api/webhooks/:path*',
    // 页面路由
    '/testcases/:path*',
    '/test-suites',
    '/executions',
    '/scheduled-tasks',
    '/bugs/:path*',
    '/reports',
    '/knowledge',
    '/pages',
    '/webhooks',
  ],
};
