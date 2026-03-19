import { NextRequest } from 'next/server';
import { DocumentParser } from '@/lib/ai/agents/document-parser';
import { RequirementParser } from '@/lib/ai/agents/requirement-parser';
import { errors, successResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { persistRequirementIngestion } from '@/lib/requirements/ingestion';

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const projectId = normalizeText(formData.get('projectId'));
  const titleInput = normalizeText(formData.get('title'));

  const canReadFile =
    !!file &&
    typeof file === 'object' &&
    typeof (file as { arrayBuffer?: unknown }).arrayBuffer === 'function';

  if (!canReadFile) {
    return errors.badRequest('file is required');
  }

  if (!projectId) {
    return errors.badRequest('projectId is required');
  }

  const canAccessProject = await hasProjectAccess(session.user.id, projectId);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  const bytes = await (file as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
  const buffer = Buffer.from(bytes);
  if (buffer.length === 0) {
    return errors.badRequest('File content is empty');
  }

  const documentParser = new DocumentParser();
  let parsedDocument;
  try {
    const filename =
      typeof (file as { name?: unknown }).name === 'string'
        ? ((file as { name: string }).name || 'upload.txt')
        : 'upload.txt';
    parsedDocument = await documentParser.parse(buffer, filename);
  } catch (error) {
    return errors.badRequest(error instanceof Error ? error.message : 'Failed to parse document');
  }

  const requirementParser = new RequirementParser();
  let parsedRequirement;
  try {
    parsedRequirement = await requirementParser.parse(parsedDocument.content);
  } catch (error) {
    return errors.badRequest(
      error instanceof Error ? error.message : 'Failed to parse requirement content'
    );
  }

  try {
    const result = await persistRequirementIngestion({
      projectId,
      title: titleInput || parsedDocument.title,
      type: parsedDocument.type,
      filename: parsedDocument.filename,
      content: parsedDocument.content,
      rawText: parsedDocument.rawText,
      size: parsedDocument.size,
      parsedRequirement,
      createdBy: session.user.id,
    });

    return successResponse(result, 'Requirement uploaded');
  } catch (error) {
    console.error('Requirement upload failed:', error);
    return errors.internalError();
  }
}
