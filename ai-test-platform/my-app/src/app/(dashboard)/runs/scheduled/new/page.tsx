'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function parseTestIds(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CreateScheduledRunPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [cron, setCron] = useState('0 9 * * *');
  const [testIdsInput, setTestIdsInput] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const testIds = parseTestIds(testIdsInput);
      if (testIds.length === 0) {
        throw new Error('Please provide at least one testId');
      }

      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          projectId: projectId.trim(),
          testIds,
          type: 'SCHEDULED',
          cron: cron.trim(),
          autoStart: false,
        }),
      });

      const json = (await response.json()) as {
        data?: { id?: string };
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(json.error?.message || 'Failed to create scheduled run');
      }

      toast.success('Scheduled run created');
      router.push('/runs?tab=scheduled');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create scheduled run');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/runs?tab=scheduled">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Scheduled Run</h1>
          <p className="text-sm text-slate-500">Create a scheduled run task.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4 bg-white">
        <div>
          <label className="text-sm font-medium">Project ID *</label>
          <Input value={projectId} onChange={(event) => setProjectId(event.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium">Task Name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
        </div>

        <div>
          <label className="text-sm font-medium">Cron *</label>
          <Input value={cron} onChange={(event) => setCron(event.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium">Test IDs *</label>
          <Textarea
            value={testIdsInput}
            onChange={(event) => setTestIdsInput(event.target.value)}
            rows={6}
            placeholder="Enter test IDs separated by comma or new line"
            required
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
          Create Scheduled Task
        </Button>
      </form>
    </div>
  );
}
