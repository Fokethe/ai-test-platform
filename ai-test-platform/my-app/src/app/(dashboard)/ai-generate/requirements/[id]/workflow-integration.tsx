/**
 * Workflow Integration Component
 * LangGraph工作流集成组件
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Edit3
} from 'lucide-react';

interface WorkflowIntegrationProps {
  requirementId: string;
  requirementText: string;
  onWorkflowComplete?: (testCases: any[]) => void;
}

interface WorkflowState {
  workflowId: string;
  status: string;
  progress: number;
  generatedCases?: any[];
  reviewRequired?: boolean;
  error?: string;
}

const STATUS_LABELS: Record<string, string> = {
  idle: '准备就绪',
  parsing: '解析文档',
  analyzing: '分析需求',
  decomposing: '拆解功能',
  retrieving: '检索相似用例',
  generating: '生成测试用例',
  reviewing: '等待审核',
  completed: '已完成',
  error: '执行错误',
};

export function WorkflowIntegration({ 
  requirementId, 
  requirementText,
  onWorkflowComplete 
}: WorkflowIntegrationProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 启动工作流
  const startWorkflow = async () => {
    setIsStarting(true);
    try {
      const response = await fetch('/api/ai/workflow/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          requirementText,
          config: {
            enableRAG: true,
            enableReview: true,
            maxRetries: 3,
          },
        }),
      });

      if (!response.ok) throw new Error('启动失败');

      const data = await response.json();
      setWorkflowState({
        workflowId: data.workflowId,
        status: data.status,
        progress: 0,
      });
      
      toast.success('工作流已启动');
      startPolling(data.workflowId);
    } catch (error) {
      toast.error('启动工作流失败');
    } finally {
      setIsStarting(false);
    }
  };

  // 轮询状态
  const startPolling = (workflowId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai/workflow/status/${workflowId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        setWorkflowState(prev => ({ ...prev!, ...data }));
        
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(pollingRef.current!);
          if (data.status === 'completed' && onWorkflowComplete) {
            onWorkflowComplete(data.data?.generatedCases || []);
          }
        }
      } catch (error) {
        console.error('轮询失败:', error);
      }
    }, 2000);
  };

  // 提交审核
  const submitReview = async (decision: 'approve' | 'edit' | 'regenerate', comments?: string) => {
    if (!workflowState?.workflowId) return;
    
    try {
      const response = await fetch('/api/ai/workflow/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: workflowState.workflowId,
          decision,
          comments,
        }),
      });

      if (!response.ok) throw new Error('提交失败');
      
      toast.success('审核已提交');
      startPolling(workflowState.workflowId);
    } catch (error) {
      toast.error('提交审核失败');
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // 未启动状态
  if (!workflowState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI智能生成工作流</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            使用LangGraph AI编排引擎，自动分析需求并生成测试用例
          </p>
          <Button onClick={startWorkflow} disabled={isStarting} className="w-full">
            {isStarting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isStarting ? '启动中...' : '启动AI生成工作流'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 执行中状态
  if (workflowState.status !== 'reviewing' && workflowState.status !== 'completed' && workflowState.status !== 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            AI生成中...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{STATUS_LABELS[workflowState.status]}</span>
            <span>{workflowState.progress}%</span>
          </div>
          <Progress value={workflowState.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>文档解析</span>
            <span>需求分析</span>
            <span>测试生成</span>
            <span>完成</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 审核状态
  if (workflowState.status === 'reviewing' && workflowState.generatedCases) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-yellow-500" />
            审核生成的测试用例
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            AI已生成 {workflowState.generatedCases.length} 个测试用例，请审核
          </p>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => submitReview('approve')}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              批准
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => submitReview('regenerate', '需要重新生成')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重新生成
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 完成状态
  if (workflowState.status === 'completed') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            AI生成完成
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            已成功生成 {workflowState.generatedCases?.length || 0} 个测试用例
          </p>
          <Button onClick={startWorkflow} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新生成
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (workflowState.status === 'error') {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            生成失败
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">{workflowState.error || '未知错误'}</p>
          <Button onClick={startWorkflow} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
