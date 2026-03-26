import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errors.badRequest('avatar is required');
    }

    const file = formData.get('avatar');
    if (!(file instanceof File)) {
      return errors.badRequest('avatar is required');
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return errors.badRequest('Unsupported image format');
    }

    if (file.size > MAX_SIZE) {
      return errors.badRequest('Avatar size exceeds 2MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = `data:${file.type};base64,${buffer.toString('base64')}`;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image },
      select: { id: true, image: true },
    });

    return successResponse(user, 'Avatar uploaded');
  } catch (error) {
    console.error('Avatar upload failed:', error);
    return errors.internalError();
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    });

    return successResponse({ image: '' }, 'Avatar deleted');
  } catch (error) {
    console.error('Avatar delete failed:', error);
    return errors.internalError();
  }
}
