'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bug, FileImage, FileText, Loader2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api';

function AttachmentUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }

    const validFiles = Array.from(selectedFiles).filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      handleFileSelect(event.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-slate-500" />;
  };

  return (
    <div>
      <label className="text-sm font-medium">附件</label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(event) => handleFileSelect(event.target.files)}
        multiple
        accept="image/*,.txt,.log,.pdf"
        className="hidden"
      />

      <div
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors"
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600">拖拽文件到此处，或点击上传</p>
        <p className="text-xs text-slate-400 mt-1">支持图片、PDF、文本日志，单文件最大 10MB</p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type CreateIssueResponse = {
  code?: number;
  message?: string;
  data?: { id?: string };
  id?: string;
};

export default function CreateIssuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const executionId = searchParams.get('executionId') ?? '';
  const [projectId, setProjectId] = useState(searchParams.get('projectId') ?? '');
  const [testId, setTestId] = useState(searchParams.get('testId') ?? '');
  const [runId, setRunId] = useState(searchParams.get('runId') ?? '');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const severity = String(formData.get('severity') ?? 'MEDIUM').trim();

    const payload = {
      title,
      description,
      type: 'BUG',
      severity,
      priority: severity,
      projectId: projectId.trim(),
      testId: testId.trim() || undefined,
      runId: runId.trim() || undefined,
      executionId: executionId || undefined,
    };

    try {
      const result = await apiClient.post<CreateIssueResponse>('/issues', payload);
      const issueId = result?.data?.id ?? result?.id;
      if (!issueId) {
        throw new Error('Invalid create issue response');
      }
      router.push(`/quality/issues/${issueId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '创建失败';
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quality/issues">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新建问题</h1>
          <p className="text-slate-500">从失败执行或手动信息创建 Issue</p>
        </div>
      </div>

      {executionId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          已从失败执行发起，executionId: <code>{executionId}</code>
        </div>
      )}

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">项目 ID *</label>
            <Input
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              placeholder="例如: cm123..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">严重级别 *</label>
            <select
              name="severity"
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              defaultValue="MEDIUM"
              required
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">关联测试 ID</label>
            <Input
              value={testId}
              onChange={(event) => setTestId(event.target.value)}
              placeholder="可选"
            />
          </div>

          <div>
            <label className="text-sm font-medium">关联 Run ID</label>
            <Input
              value={runId}
              onChange={(event) => setRunId(event.target.value)}
              placeholder="可选"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">标题 *</label>
          <Input
            name="title"
            defaultValue={executionId ? 'Failed execution' : ''}
            placeholder="简要描述问题"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">问题描述 *</label>
          <Textarea
            name="description"
            rows={10}
            defaultValue={executionId ? 'Failure Context\n' : ''}
            placeholder="重现步骤、实际结果、预期结果、环境信息"
            required
          />
        </div>

        <AttachmentUpload />

        <div className="flex gap-4 pt-6 border-t">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                提交问题
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/quality/issues">取消</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
