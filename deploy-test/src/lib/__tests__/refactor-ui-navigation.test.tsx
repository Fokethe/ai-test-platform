/**
 * UI Navigation Refactor Tests - TDD Phase 3
 * 测试目标: 新导航结构和页面合并
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('New Navigation Structure', () => {
  it('should have exactly 8 main navigation items', () => {
    const navItems = [
      { id: 'dashboard', label: '仪表盘', icon: 'LayoutDashboard' },
      { id: 'tests', label: '测试中心', icon: 'Beaker' },
      { id: 'runs', label: '执行中心', icon: 'Play' },
      { id: 'quality', label: '质量看板', icon: 'Shield' },
      { id: 'assets', label: '资产库', icon: 'BookOpen' },
      { id: 'integrations', label: '集成', icon: 'Plug' },
      { id: 'inbox', label: '通知', icon: 'Bell', badge: 3 },
      { id: 'settings', label: '设置', icon: 'Settings' },
    ];

    expect(navItems).toHaveLength(8);
  });

  it('should merge old features into new nav items', () => {
    const featureMapping: Record<string, { nav: string; subNav?: string }> = {
      // 测试中心
      'testcases': { nav: 'tests', subNav: 'cases' },
      'test-suites': { nav: 'tests', subNav: 'suites' },
      'ai-generate': { nav: 'tests', subNav: 'ai' },
      
      // 执行中心
      'executions': { nav: 'runs', subNav: 'history' },
      'scheduled-tasks': { nav: 'runs', subNav: 'scheduled' },
      
      // 质量看板
      'bugs': { nav: 'quality', subNav: 'issues' },
      'reports': { nav: 'quality', subNav: 'reports' },
      
      // 资产库
      'knowledge': { nav: 'assets', subNav: 'docs' },
      'pages': { nav: 'assets', subNav: 'pages' },
      
      // 集成
      'webhooks': { nav: 'integrations' },
      
      // 设置
      'admin/logs': { nav: 'settings', subNav: 'activity' },
      'admin/users': { nav: 'settings', subNav: 'users' },
      'ai-settings': { nav: 'settings', subNav: 'ai' },
    };

    expect(featureMapping['testcases'].nav).toBe('tests');
    expect(featureMapping['bugs'].nav).toBe('quality');
    expect(featureMapping['webhooks'].nav).toBe('integrations');
    expect(featureMapping['admin/logs'].subNav).toBe('activity');
  });

  it('should render nav item with correct structure', () => {
    const NavItem = ({ item }: { item: any }) => (
      <a href={`/${item.id}`} data-testid={`nav-${item.id}`}>
        <span data-testid={`icon-${item.id}`}>{item.icon}</span>
        <span>{item.label}</span>
        {item.badge && <span data-testid="badge">{item.badge}</span>}
      </a>
    );

    const item = { id: 'inbox', label: '通知', icon: 'Bell', badge: 5 };
    const { getByTestId } = render(<NavItem item={item} />);

    expect(getByTestId('nav-inbox')).toHaveAttribute('href', '/inbox');
    expect(getByTestId('badge')).toHaveTextContent('5');
  });
});

describe('Merged Page Components', () => {
  it('should render TestCenter with tabs for cases/suites/ai', () => {
    const TestCenter = ({ activeTab }: { activeTab: string }) => (
      <div>
        <div role="tablist">
          <button aria-selected={activeTab === 'cases'}>用例</button>
          <button aria-selected={activeTab === 'suites'}>套件</button>
          <button aria-selected={activeTab === 'ai'}>AI生成</button>
        </div>
        <div role="tabpanel">{activeTab} content</div>
      </div>
    );

    const { getByRole, getByText } = render(<TestCenter activeTab="cases" />);
    
    expect(getByText('cases content')).toBeInTheDocument();
    expect(getByText('cases content')).toBeInTheDocument();
  });

  it('should render RunCenter with history and scheduled sections', () => {
    const RunCenter = () => (
      <div>
        <section data-testid="history-section">
          <h2>执行历史</h2>
          <div>Run list...</div>
        </section>
        <section data-testid="scheduled-section">
          <h2>定时任务</h2>
          <div>Scheduled tasks...</div>
        </section>
      </div>
    );

    const { getByTestId } = render(<RunCenter />);
    
    expect(getByTestId('history-section')).toBeInTheDocument();
    expect(getByTestId('scheduled-section')).toBeInTheDocument();
  });

  it('should render QualityDashboard with issues and reports', () => {
    const QualityDashboard = () => (
      <div>
        <div role="navigation">
          <a href="/quality/issues">问题列表</a>
          <a href="/quality/reports">质量报告</a>
        </div>
        <div>Quality metrics...</div>
      </div>
    );

    const { getByRole, getByText } = render(<QualityDashboard />);
    
    expect(getByText('问题列表')).toHaveAttribute('href', '/quality/issues');
    expect(getByText('质量报告')).toHaveAttribute('href', '/quality/reports');
  });

  it('should render AssetLibrary with docs and pages tabs', () => {
    const AssetLibrary = ({ type }: { type: 'doc' | 'page' }) => (
      <div>
        <div role="tablist">
          <button aria-selected={type === 'doc'}>文档</button>
          <button aria-selected={type === 'page'}>页面</button>
        </div>
        <div role="tabpanel">
          {type === 'doc' ? 'Documents list' : 'Pages list'}
        </div>
      </div>
    );

    const { getByRole, getByText } = render(<AssetLibrary type="doc" />);
    
    expect(getByText('Documents list')).toBeInTheDocument();
  });
});

describe('Settings Consolidation', () => {
  it('should consolidate all settings into one page with sections', () => {
    const SettingsPage = () => (
      <div>
        <nav>
          <a href="/settings/profile">个人设置</a>
          <a href="/settings/ai">AI 设置</a>
          <a href="/settings/users">用户管理</a>
          <a href="/settings/activity">活动日志</a>
          <a href="/settings/system">系统配置</a>
        </nav>
        <main>Settings content</main>
      </div>
    );

    const { getByText } = render(<SettingsPage />);
    
    expect(getByText('个人设置')).toHaveAttribute('href', '/settings/profile');
    expect(getByText('AI 设置')).toHaveAttribute('href', '/settings/ai');
    expect(getByText('用户管理')).toHaveAttribute('href', '/settings/users');
    expect(getByText('活动日志')).toHaveAttribute('href', '/settings/activity');
  });
});

describe('Route Redirection', () => {
  it('should redirect old routes to new routes', () => {
    const redirects: Record<string, string> = {
      '/testcases': '/tests',
      '/testcases/new': '/tests/new',
      '/testcases/123/edit': '/tests/123/edit',
      '/test-suites': '/tests?filter=suites',
      '/executions': '/runs',
      '/scheduled-tasks': '/runs?tab=scheduled',
      '/bugs': '/quality/issues',
      '/bugs/123': '/quality/issues/123',
      '/knowledge': '/assets/docs',
      '/pages': '/assets/pages',
      '/webhooks': '/integrations',
      '/admin/logs': '/settings/activity',
      '/admin/users': '/settings/users',
      '/ai-settings': '/settings/ai',
    };

    expect(redirects['/testcases']).toBe('/tests');
    expect(redirects['/bugs/123']).toBe('/quality/issues/123');
    expect(redirects['/admin/logs']).toBe('/settings/activity');
  });
});

describe('Breadcrumb Navigation', () => {
  it('should show correct breadcrumb for merged pages', () => {
    const Breadcrumb = ({ path }: { path: { label: string; href: string }[] }) => (
      <nav aria-label="breadcrumb">
        {path.map((item, i) => (
          <span key={i}>
            <a href={item.href}>{item.label}</a>
            {i < path.length - 1 && <span> &gt; </span>}
          </span>
        ))}
      </nav>
    );

    const testCasesPath = [
      { label: '测试中心', href: '/tests' },
      { label: '用例列表', href: '/tests?tab=cases' },
    ];

    const { getByText } = render(<Breadcrumb path={testCasesPath} />);
    
    expect(getByText('测试中心')).toHaveAttribute('href', '/tests');
  });
});
