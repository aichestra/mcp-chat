import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { localModels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/local-models/[id]/models - List available models
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

    return NextResponse.json({ availableModels: model[0].availableModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

// POST /api/local-models/[id]/models - Refresh available models
export async function POST(
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

    // Get the endpoint details
    const [endpoint] = await db
      .select()
      .from(localModels)
      .where(and(eq(localModels.id, id), eq(localModels.userId, userId)))
      .limit(1);

    if (!endpoint) {
      return NextResponse.json({ error: 'Local model not found' }, { status: 404 });
    }

    // Discover models from the endpoint
    const availableModels = await discoverModels(endpoint.baseUrl, endpoint.apiKey);

    // Update the endpoint with discovered models
    const [updatedModel] = await db
      .update(localModels)
      .set({
        availableModels,
        lastModelDiscovery: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(localModels.id, id), eq(localModels.userId, userId)))
      .returning();

    return NextResponse.json({ 
      availableModels: updatedModel.availableModels,
      message: `Discovered ${availableModels.length} models`
    });
  } catch (error) {
    console.error('Error refreshing models:', error);
    return NextResponse.json(
      { error: 'Failed to refresh models' },
      { status: 500 }
    );
  }
}

// Helper function to discover models from an endpoint
async function discoverModels(baseUrl: string, apiKey?: string): Promise<string[]> {
  try {
    // Extract the base URL without the /v1 suffix
    const baseApiUrl = baseUrl.replace(/\/v1\/?$/, '');
    
    // Try Ollama's API first
    try {
      const ollamaUrl = `${baseApiUrl}/api/tags`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch(ollamaUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((model: any) => model.name) || [];
      }
    } catch (ollamaError) {
      console.log('Not an Ollama endpoint or error:', ollamaError);
    }
    
    // Try OpenAI compatible API
    try {
      const openaiUrl = `${baseApiUrl}/models`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch(openaiUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((model: any) => model.id || model.name);
        }
      }
    } catch (openaiError) {
      console.log('Not an OpenAI compatible endpoint or error:', openaiError);
    }
    
    // If we can't detect models, return empty array
    return [];
  } catch (error) {
    console.error('Error discovering models:', error);
    return [];
  }
}
