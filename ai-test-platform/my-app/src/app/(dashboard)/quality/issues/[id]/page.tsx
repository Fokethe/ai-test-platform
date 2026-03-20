'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const ISSUE_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

type IssueStatus = (typeof ISSUE_STATUSES)[number];

type IssueDetail = {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: string;
  resolution: string | null;
  runId: string | null;
  testId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  project: { id: string; name: string };
  reporter: { id: string; name: string | null; email: string | null };
  assignee: { id: string; name: string | null; email: string | null } | null;
  run: { id: string; name: string; status: string } | null;
  test: { id: string; name: string; type: string } | null;
};

type IssueResponse = {
  code: number;
  data: IssueDetail;
  message?: string;
};

function fetcher(url: string): Promise<IssueResponse> {
  return fetch(url).then(async (response) => {
    const json = (await response.json()) as IssueResponse;
    if (!response.ok) {
      throw new Error((json as { error?: { message?: string } }).error?.message || 'Request failed');
    }
    return json;
  });
}

export default function IssueDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error, mutate } = useSWR(id ? `/api/issues/${id}` : null, fetcher);

  const issue = data?.data;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IssueStatus>('OPEN');
  const [priority, setPriority] = useState('MEDIUM');
  const [resolution, setResolution] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!issue) {
      return;
    }

    setTitle(issue.title);
    setDescription(issue.description ?? '');
    setStatus(issue.status);
    setPriority(issue.priority);
    setResolution(issue.resolution ?? '');
    setAssigneeId(issue.assignee?.id ?? '');
  }, [issue]);

  const statusBadge = useMemo(() => {
    const map: Record<IssueStatus, string> = {
      OPEN: 'bg-red-100 text-red-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      RESOLVED: 'bg-emerald-100 text-emerald-700',
      CLOSED: 'bg-slate-100 text-slate-700',
    };
    return map[status];
  }, [status]);

  const handleSave = async () => {
    if (!issue) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          resolution: resolution.trim() || null,
          assigneeId: assigneeId.trim() || null,
        }),
      });

      const json = (await response.json()) as { message?: string; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(json.error?.message || 'Save failed');
      }

      toast.success('Issue updated');
      await mutate();
    } catch (saveError: unknown) {
      const message = saveError instanceof Error ? saveError.message : 'Save failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">Failed to load issue detail.</p>
        <Button variant="outline" className="mt-4" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quality/issues">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Issue Detail</h1>
            <p className="text-sm text-slate-500">{issue.id}</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save
        </Button>
      </div>

      <div className="rounded-lg border p-4 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Badge className={statusBadge}>{status}</Badge>
          <Badge variant="outline">{issue.severity}</Badge>
          <Badge variant="outline">Priority: {priority}</Badge>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={8} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as IssueStatus)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {ISSUE_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Assignee ID</label>
              <Input value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} placeholder="optional" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Resolution</label>
            <Input value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="FIXED / WONT_FIX ..." />
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-white space-y-2 text-sm">
        <p>
          Project: <strong>{issue.project.name}</strong> ({issue.project.id})
        </p>
        <p>
          Reporter: <strong>{issue.reporter.name ?? issue.reporter.email ?? 'Unknown'}</strong>
        </p>
        <p>
          Assignee: <strong>{issue.assignee?.name ?? issue.assignee?.email ?? 'Unassigned'}</strong>
        </p>
        <p>
          Related Run:{' '}
          {issue.run ? (
            <Link className="text-blue-600 hover:underline" href={`/runs/${issue.run.id}`}>
              {issue.run.name}
            </Link>
          ) : (
            <span>-</span>
          )}
        </p>
        <p>
          Related Test:{' '}
          {issue.test ? (
            <Link className="text-blue-600 hover:underline" href={`/tests/${issue.test.id}`}>
              {issue.test.name}
            </Link>
          ) : (
            <span>-</span>
          )}
        </p>
        <p>Created At: {new Date(issue.createdAt).toLocaleString()}</p>
        <p>Updated At: {new Date(issue.updatedAt).toLocaleString()}</p>
        <p>Resolved At: {issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleString() : '-'}</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStatus('IN_PROGRESS')}>
          Mark In Progress
        </Button>
        <Button variant="outline" onClick={() => setStatus('RESOLVED')}>
          Mark Resolved
        </Button>
        <Button variant="outline" onClick={() => setStatus('CLOSED')}>
          Mark Closed
        </Button>
      </div>
    </div>
  );
}
