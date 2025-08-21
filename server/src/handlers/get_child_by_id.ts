import { db } from '../db';
import { childrenTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Child } from '../schema';

export async function getChildById(id: number): Promise<Child | null> {
  try {
    const results = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('Failed to get child by ID:', error);
    throw error;
  }
}