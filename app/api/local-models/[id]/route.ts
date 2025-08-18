import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { localModels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/local-models/[id] - Get endpoint details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const model = await db
      .select()
      .from(localModels)
      .where(and(eq(localModels.id, id), eq(localModels.userId, userId)))
      .limit(1);

    if (!model.length) {
      return NextResponse.json({ error: 'Local model not found' }, { status: 404 });
    }

    return NextResponse.json(model[0]);
  } catch (error) {
    console.error('Error fetching local model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch local model' },
      { status: 500 }
    );
  }
}

// PUT /api/local-models/[id] - Update endpoint
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, baseUrl, apiKey, endpointType, isActive, userId } = body;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (endpointType !== undefined) updateData.endpointType = endpointType;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedModel] = await db
      .update(localModels)
      .set(updateData)
      .where(and(eq(localModels.id, id), eq(localModels.userId, userId)))
      .returning();

    if (!updatedModel) {
      return NextResponse.json({ error: 'Local model not found' }, { status: 400 });
    }

    return NextResponse.json(updatedModel);
  } catch (error) {
    console.error('Error updating local model:', error);
    return NextResponse.json(
      { error: 'Failed to update local model' },
      { status: 500 }
    );
  }
}

// DELETE /api/local-models/[id] - Delete endpoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const deletedModel = await db
      .delete(localModels)
      .where(and(eq(localModels.id, id), eq(localModels.userId, userId)))
      .returning();

    if (!deletedModel.length) {
      return NextResponse.json({ error: 'Local model not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Local model deleted successfully' });
  } catch (error) {
    console.error('Error deleting local model:', error);
    return NextResponse.json(
      { error: 'Failed to delete local model' },
      { status: 500 }
    );
  }
}
