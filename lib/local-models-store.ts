import { db } from "./db";
import { localModels, type LocalModel } from "./db/schema";
import { eq, and } from "drizzle-orm";

export type LocalModelWithModels = LocalModel & {
  availableModels: string[];
};

/**
 * Get all local model endpoints for a user
 */
export async function getLocalModels(userId: string): Promise<LocalModel[]> {
  try {
    return await db.query.localModels.findMany({
      where: eq(localModels.userId, userId),
      orderBy: [localModels.createdAt]
    });
  } catch (error) {
    console.error('Failed to get local models from database:', error);
    return [];
  }
}

/**
 * Get a specific local model endpoint by ID
 */
export async function getLocalModelById(id: string, userId: string): Promise<LocalModel | null> {
  try {
    return await db.query.localModels.findFirst({
      where: and(
        eq(localModels.id, id),
        eq(localModels.userId, userId)
      )
    });
  } catch (error) {
    console.error('Failed to get local model by ID:', error);
    return null;
  }
}

/**
 * Create a new local model endpoint
 */
export async function createLocalModel(modelData: Omit<LocalModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalModel> {
  try {
    const [createdModel] = await db.insert(localModels).values({
      ...modelData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return createdModel;
  } catch (error) {
    console.error('Failed to create local model:', error);
    throw error;
  }
}

/**
 * Update an existing local model endpoint
 */
export async function updateLocalModel(id: string, userId: string, updates: Partial<Omit<LocalModel, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LocalModel | null> {
  try {
    const [updatedModel] = await db
      .update(localModels)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(localModels.id, id),
        eq(localModels.userId, userId)
      ))
      .returning();
    
    return updatedModel;
  } catch (error) {
    console.error('Failed to update local model:', error);
    return null;
  }
}

/**
 * Delete a local model endpoint
 */
export async function deleteLocalModel(id: string, userId: string): Promise<boolean> {
  try {
    await db.delete(localModels).where(
      and(
        eq(localModels.id, id),
        eq(localModels.userId, userId)
      )
    );
    return true;
  } catch (error) {
    console.error('Failed to delete local model:', error);
    return false;
  }
}

/**
 * Get all active local models with their available models
 */
export async function getActiveLocalModels(userId: string): Promise<LocalModelWithModels[]> {
  try {
    const models = await getLocalModels(userId);
    return models
      .filter(model => model.isActive)
      .map(model => ({
        ...model,
        availableModels: model.availableModels || []
      }));
  } catch (error) {
    console.error('Failed to get active local models:', error);
    return [];
  }
}

/**
 * Update available models for a local model endpoint
 */
export async function updateAvailableModels(id: string, userId: string, availableModels: string[]): Promise<boolean> {
  try {
    await db
      .update(localModels)
      .set({
        availableModels,
        lastModelDiscovery: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(localModels.id, id),
        eq(localModels.userId, userId)
      ));
    
    return true;
  } catch (error) {
    console.error('Failed to update available models:', error);
    return false;
  }
}

/**
 * Toggle active status of a local model endpoint
 */
export async function toggleLocalModelActive(id: string, userId: string): Promise<boolean> {
  try {
    const currentModel = await getLocalModelById(id, userId);
    if (!currentModel) return false;
    
    const [updatedModel] = await db
      .update(localModels)
      .set({
        isActive: !currentModel.isActive,
        updatedAt: new Date()
      })
      .where(and(
        eq(localModels.id, id),
        eq(localModels.userId, userId)
      ))
      .returning();
    
    return !!updatedModel;
  } catch (error) {
    console.error('Failed to toggle local model active status:', error);
    return false;
  }
}
