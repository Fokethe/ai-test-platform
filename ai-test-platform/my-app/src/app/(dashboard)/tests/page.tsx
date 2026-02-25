/**
 * TestCenter Page - 合并用例/套件/AI生成
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Beaker, Plus, Folder, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TestCenterPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'cases';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'cases', label: '用例', icon: Beaker },
    { id: 'suites', label: '套件', icon: Folder },
    { id: 'ai', label: 'AI生成', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">测试中心</h1>
          <p className="text-slate-500">管理测试用例、套件和 AI 生成</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          新建
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索测试用例、套件..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          <TestCasesList searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="suites" className="mt-6">
          <TestSuitesList searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIGeneratePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 用例列表
function TestCasesList({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">测试用例</h2>
        <span className="text-sm text-slate-500">共 128 个用例</span>
      </div>
      
      <div className="border rounded-lg">
        <div className="p-8 text-center text-slate-500">
          <Beaker className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>用例列表将在这里显示</p>
          <p className="text-sm mt-1">搜索: {searchQuery || '（空）'}</p>
        </div>
      </div>
    </div>
  );
}

// 套件列表
function TestSuitesList({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">测试套件</h2>
        <span className="text-sm text-slate-500">共 16 个套件</span>
      </div>
      
      <div className="border rounded-lg">
        <div className="p-8 text-center text-slate-500">
          <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>套件列表将在这里显示</p>
          <p className="text-sm mt-1">搜索: {searchQuery || '（空）'}</p>
        </div>
      </div>
    </div>
  );
}

// AI 生成面板
function AIGeneratePanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI 生成测试</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6">
          <Sparkles className="w-8 h-8 mb-4 text-blue-500" />
          <h3 className="font-medium mb-2">从需求生成</h3>
          <p className="text-sm text-slate-500 mb-4">
            输入功能需求，AI 自动生成测试用例
          </p>
          <Button variant="outline" className="w-full">
            开始生成
          </Button>
        </div>
        
        <div className="border rounded-lg p-6">
          <Beaker className="w-8 h-8 mb-4 text-green-500" />
          <h3 className="font-medium mb-2">从页面生成</h3>
          <p className="text-sm text-slate-500 mb-4">
            选择页面，AI 自动识别元素并生成用例
          </p>
          <Button variant="outline" className="w-full">
            选择页面
          </Button>
        </div>
      </div>
    </div>
  );
}
