/**
 * NewNavItems Tests
 * 新的导航结构测试
 */
import { newNavItems, routeMapping, getRedirectPath, NavItem } from '../NewNavItems';
import { LayoutDashboard, FolderOpen, Beaker, Play, Shield, BookOpen, Plug, Bell, Settings } from 'lucide-react';

describe('NewNavItems', () => {
  describe('Navigation Structure', () => {
    it('should have 9 navigation items', () => {
      expect(newNavItems).toHaveLength(9);
    });
    
    it('should have dashboard as first item', () => {
      expect(newNavItems[0].id).toBe('dashboard');
      expect(newNavItems[0].label).toBe('仪表盘');
    });
  });
  
  describe('SubItems', () => {
    it('should have subItems for tests navigation', () => {
      const testsNav = newNavItems.find(item => item.id === 'tests');
      expect(testsNav?.subItems).toBeDefined();
      expect(testsNav?.subItems).toHaveLength(3);
    });
  });
  
  describe('Route Mapping', () => {
    it('should map old routes to new routes', () => {
      expect(routeMapping['/testcases']).toBe('/tests');
      expect(routeMapping['/executions']).toBe('/runs');
    });
  });

  describe('getRedirectPath', () => {
    it('should return mapped path for exact matches', () => {
      expect(getRedirectPath('/testcases')).toBe('/tests');
      expect(getRedirectPath('/executions')).toBe('/runs');
    });

    it('should return null for unknown paths', () => {
      expect(getRedirectPath('/unknown')).toBeNull();
    });
  });
});
