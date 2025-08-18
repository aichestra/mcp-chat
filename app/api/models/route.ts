import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { localModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';

    // Get base models (these are always available)
    const baseModels = [
      {
        id: "qwen3-32b",
        name: "Qwen 3 32B",
        provider: "Groq",
        description: "Latest version of Alibaba's Qwen 32B with strong reasoning and coding capabilities.",
        apiVersion: "qwen3-32b",
        capabilities: ["Reasoning", "Efficient", "Agentic"]
      },
      {
        id: "grok-3-mini",
        name: "Grok 3 Mini",
        provider: "XAI",
        description: "Latest version of XAI's Grok 3 Mini with strong reasoning and coding capabilities.",
        apiVersion: "grok-3-mini-latest",
        capabilities: ["Reasoning", "Efficient", "Agentic"]
      },
      {
        id: "kimi-k2",
        name: "Kimi K2",
        provider: "Groq",
        description: "Latest version of Moonshot AI's Kimi K2 with good balance of capabilities.",
        apiVersion: "kimi-k2-instruct",
        capabilities: ["Balanced", "Efficient", "Agentic"]
      },
      {
        id: "llama4",
        name: "Llama 4",
        provider: "Groq",
        description: "Latest version of Meta's Llama 4 with good balance of capabilities.",
        apiVersion: "llama-4-scout-17b-16e-instruct",
        capabilities: ["Balanced", "Efficient", "Agentic"]
      }
    ];

    // Get local models from database
    const dbLocalModels = await db
      .select()
      .from(localModels)
      .where(eq(localModels.userId, userId));

    console.log(`API /models: Found ${dbLocalModels.length} local model endpoints in database`);
    
    // Process local models and add their available models
    const localModelList: any[] = [];
    dbLocalModels.forEach(localModel => {
      console.log(`API /models: Processing local model endpoint: ${localModel.name} (${localModel.baseUrl}), isActive: ${localModel.isActive}, models: ${JSON.stringify(localModel.availableModels)}`);
      
      if (localModel.isActive && localModel.availableModels && localModel.availableModels.length > 0) {
        localModel.availableModels.forEach(modelName => {
          console.log(`API /models: Adding local model: ${modelName} from ${localModel.name}`);
          localModelList.push({
            id: modelName,
            name: modelName,
            provider: localModel.name,
            description: `Local model from ${localModel.name} (${localModel.baseUrl})`,
            apiVersion: "OpenAI-compatible",
            capabilities: ["Local", "Reasoning", "Code"],
            baseUrl: localModel.baseUrl
          });
        });
      } else {
        console.log(`API /models: Skipping inactive or empty endpoint: ${localModel.name}`);
      }
    });

    // Combine base models and local models
    const allModels = [...baseModels, ...localModelList];

    console.log(`API /models: Returning ${allModels.length} models (${baseModels.length} base + ${localModelList.length} local)`);
    
    // Log the actual model IDs being returned
    console.log(`API /models: Local model IDs: ${localModelList.map(m => m.id).join(', ')}`);

    return NextResponse.json({
      models: allModels,
      baseCount: baseModels.length,
      localCount: localModelList.length
    });

  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
