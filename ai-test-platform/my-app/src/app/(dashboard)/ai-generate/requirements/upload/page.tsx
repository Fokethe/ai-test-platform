'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface UploadState {
  file: File | null;
  title: string;
  description: string;
  projectId: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({
    file: null,
    title: '',
    description: '',
    projectId: '',
  });
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0] ?? null;
    setState((prev) => ({ ...prev, file }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const clearFile = () => {
    setState((prev) => ({ ...prev, file: null }));
  };

  const handleUpload = async () => {
    if (!state.projectId.trim()) {
      toast.error('projectId is required');
      return;
    }

    if (!state.file) {
      toast.error('Please select a requirement file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('projectId', state.projectId.trim());
      if (state.title.trim()) {
        formData.append('title', state.title.trim());
      }
      if (state.description.trim()) {
        formData.append('description', state.description.trim());
      }
      formData.append('file', state.file);

      const response = await fetch('/api/requirements/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || payload?.code !== 0 || !payload?.data?.id) {
        throw new Error(payload?.error?.message || payload?.message || 'Upload failed');
      }

      toast.success('Requirement uploaded');
      router.push(`/ai-generate/requirements/${payload.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Requirement</CardTitle>
          <CardDescription>
            Supported formats: TXT, MD, PDF, DOCX. Maximum size: 10MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-id">Project ID *</Label>
            <Input
              id="project-id"
              value={state.projectId}
              onChange={(event) =>
                setState((prev) => ({ ...prev, projectId: event.target.value }))
              }
              placeholder="Enter projectId"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={state.title}
              onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Optional custom requirement title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={state.description}
              onChange={(event) =>
                setState((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label>Requirement File *</Label>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-600">
                {isDragActive ? 'Drop your file here' : 'Drop or click to select a file'}
              </p>
            </div>
          </div>

          {state.file ? (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{state.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(state.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => router.back()} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !state.file}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
