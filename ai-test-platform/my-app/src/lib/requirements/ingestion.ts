import { randomUUID } from 'crypto';
import type { DocumentType } from '@/lib/ai/agents/document-parser';
import type { ParsedRequirement, Priority } from '@/lib/ai/agents/requirement-parser';
import { prisma } from '@/lib/prisma';

const VALID_PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

export interface RequirementTestPointRecord {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  relatedFeature: string;
  order: number;
}

export interface RequirementTestPointGroup {
  feature: string;
  points: RequirementTestPointRecord[];
}

export interface PersistRequirementIngestionInput {
  projectId: string;
  title: string;
  type: DocumentType;
  filename: string;
  content: string;
  rawText: string;
  size: number;
  parsedRequirement: ParsedRequirement;
  createdBy?: string | null;
}

function normalizePriority(value: unknown): Priority {
  if (typeof value === 'string' && VALID_PRIORITIES.includes(value as Priority)) {
    return value as Priority;
  }
  return 'P1';
}

export function groupTestPointsByFeature(
  testPoints: RequirementTestPointRecord[]
): RequirementTestPointGroup[] {
  const groupMap = new Map<string, RequirementTestPointRecord[]>();

  for (const point of testPoints) {
    const feature = point.relatedFeature?.trim() || 'General';
    if (!groupMap.has(feature)) {
      groupMap.set(feature, []);
    }
    groupMap.get(feature)!.push(point);
  }

  return Array.from(groupMap.entries()).map(([feature, points]) => ({
    feature,
    points,
  }));
}

export async function persistRequirementIngestion(
  input: PersistRequirementIngestionInput
) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const normalizedPoints: RequirementTestPointRecord[] = (
    input.parsedRequirement.testPoints || []
  ).map((point, index) => ({
    id: randomUUID(),
    name: point.name?.trim() || `Test Point ${index + 1}`,
    description: point.description?.trim() || '',
    priority: normalizePriority(point.priority),
    relatedFeature: point.relatedFeature?.trim() || 'General',
    order: index,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.aiRequirement.create({
      data: {
        id,
        title: input.title,
        type: input.type,
        filename: input.filename,
        content: input.content,
        rawText: input.rawText,
        size: input.size,
        features: JSON.stringify(input.parsedRequirement.features || []),
        businessRules: JSON.stringify(input.parsedRequirement.businessRules || []),
        projectId: input.projectId,
        createdBy: input.createdBy ?? null,
      },
    });

    if (normalizedPoints.length > 0) {
      await tx.testPoint.createMany({
        data: normalizedPoints.map((point) => ({
          id: point.id,
          name: point.name,
          description: point.description,
          priority: point.priority,
          relatedFeature: point.relatedFeature,
          requirementId: id,
          order: point.order,
          createdAt: new Date(),
        })),
      });
    }
  });

  return {
    id,
    title: input.title,
    type: input.type,
    filename: input.filename,
    content: input.content,
    rawText: input.rawText,
    size: input.size,
    features: input.parsedRequirement.features || [],
    businessRules: input.parsedRequirement.businessRules || [],
    testPoints: normalizedPoints,
    testPointGroups: groupTestPointsByFeature(normalizedPoints),
    projectId: input.projectId,
    createdAt,
  };
}

