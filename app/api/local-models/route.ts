import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { localModels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid/non-secure';

// GET /api/local-models - List user's endpoints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const models = await db
      .select()
      .from(localModels)
      .where(eq(localModels.userId, userId))
      .orderBy(localModels.createdAt);

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching local models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch local models' },
      { status: 500 }
    );
  }
}

// POST /api/local-models - Create new endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, baseUrl, apiKey, endpointType = 'ollama', userId } = body;

    console.log('Received request body:', body);

    if (!name || !baseUrl || !userId) {
      console.log('Validation failed:', { name, baseUrl, userId });
      return NextResponse.json(
        { error: 'Name, baseUrl, and userId are required' },
        { status: 400 }
      );
    }

    // First, discover available models from the endpoint
    console.log('Discovering models from endpoint:', baseUrl);
    const availableModels = await discoverModels(baseUrl, apiKey);
    console.log('Discovered models:', availableModels);

    const newModel = {
      id: nanoid(),
      userId,
      name,
      baseUrl,
      apiKey,
      endpointType,
      isActive: false,
      healthStatus: 'unknown' as const,
      availableModels,
      lastModelDiscovery: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Attempting to insert model:', newModel);

    const [createdModel] = await db
      .insert(localModels)
      .values(newModel)
      .returning();

    console.log('Successfully created model:', createdModel);

    return NextResponse.json(createdModel, { status: 201 });
  } catch (error) {
    console.error('Error creating local model:', error);
    return NextResponse.json(
      { error: 'Failed to create local model' },
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
      
      console.log('Trying Ollama API:', ollamaUrl);
      const response = await fetch(ollamaUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((model: any) => model.name) || [];
        console.log('Ollama models found:', models);
        return models;
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
      
      console.log('Trying OpenAI compatible API:', openaiUrl);
      const response = await fetch(openaiUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const models = data.data.map((model: any) => model.id || model.name);
          console.log('OpenAI compatible models found:', models);
          return models;
        }
      }
    } catch (openaiError) {
      console.log('Not an OpenAI compatible endpoint or error:', openaiError);
    }
    
    // If we can't detect models, return empty array
    console.log('No models discovered, returning empty array');
    return [];
  } catch (error) {
    console.error('Error discovering models:', error);
    return [];
  }
}
