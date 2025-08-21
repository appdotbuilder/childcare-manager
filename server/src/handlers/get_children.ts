import { db } from '../db';
import { childrenTable } from '../db/schema';
import { type Child } from '../schema';

export const getChildren = async (): Promise<Child[]> => {
  try {
    const results = await db.select()
      .from(childrenTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch children:', error);
    throw error;
  }
};