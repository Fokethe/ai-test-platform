'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { swrFetcher as fetcher } from '@/lib/utils/fetcher';

type ReviewFilter = 'all' | 'pending' | 'approved' | 'rejected';
type ReviewDecision = 'approve' | 'reject';
type ReviewStatus = 'pending' | 'approved' | 'rejected';
type ReviewPriority = 'high' | 'medium' | 'low';

type ReviewItem = {
  id: string;
  workflowId: string;
  type: 'testcase';
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: ReviewStatus;
  priority: ReviewPriority;
  retryCount: number;
  generatedCount: number;
  updatedAt: string;
};

type ReviewResponse = {
  code?: number;
  data?: {
    list?: ReviewItem[];
    pagination?: {
      total?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
    };
  };
};

const FILTERS: Array<{ id: ReviewFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_STYLE: Record<ReviewStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
};

const PRIORITY_STYLE: Record<ReviewPriority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-800' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low', className: 'bg-blue-100 text-blue-800' },
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function decideReview(workflowId: string, decision: ReviewDecision) {
  const response = await fetch('/api/review', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflowId,
      decision,
    }),
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch {
      // keep default message when body is not JSON
    }
    throw new Error(message);
  }
}

export default function ReviewPage() {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const apiUrl = `/api/review?status=${filter}&page=1&pageSize=50`;

  const { data, error, isLoading, mutate } = useSWR<ReviewResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  const items = data?.data?.list ?? [];
  const total = data?.data?.pagination?.total ?? items.length;

  const handleDecision = async (workflowId: string, decision: ReviewDecision) => {
    setSubmittingId(workflowId);
    try {
      await decideReview(workflowId, decision);
      toast.success(decision === 'approve' ? 'Review approved' : 'Review rejected');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update review');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-slate-500">Total {total} items</p>
        </div>
        <Button variant="outline" onClick={() => void mutate()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={filter === item.id ? 'default' : 'outline'}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load review queue.</span>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
            <AlertCircle className="mb-3 h-10 w-10 text-slate-300" />
            <p>No review item found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const status = STATUS_STYLE[item.status];
            const priority = PRIORITY_STYLE[item.priority];
            const StatusIcon = status.icon;
            const busy = submittingId === item.workflowId;
            return (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Test Case</Badge>
                        <Badge className={priority.className}>{priority.label}</Badge>
                        <Badge className={status.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="text-sm text-slate-500">
                        By {item.submittedBy} at {formatDate(item.submittedAt)}
                      </p>
                      <p className="text-xs text-slate-400">
                        Cases: {item.generatedCount} | Retry: {item.retryCount}
                      </p>
                    </div>
                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="text-red-600"
                          disabled={busy}
                          onClick={() => void handleDecision(item.workflowId, 'reject')}
                        >
                          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                          Reject
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => void handleDecision(item.workflowId, 'approve')}
                        >
                          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
