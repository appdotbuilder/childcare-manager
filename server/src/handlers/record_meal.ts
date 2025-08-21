import { db } from '../db';
import { mealsTable, childrenTable } from '../db/schema';
import { type RecordMealInput, type Meal } from '../schema';
import { eq } from 'drizzle-orm';

export const recordMeal = async (input: RecordMealInput): Promise<Meal> => {
  try {
    // Validate that the child exists
    const existingChild = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.id, input.child_id))
      .execute();

    if (existingChild.length === 0) {
      throw new Error(`Child with id ${input.child_id} not found`);
    }

    // Convert meal_date to Date object if needed, default to current date
    const mealDate = input.meal_date 
      ? (typeof input.meal_date === 'string' ? new Date(input.meal_date) : input.meal_date)
      : new Date();

    // Insert meal record
    const result = await db.insert(mealsTable)
      .values({
        child_id: input.child_id,
        meal_type: input.meal_type,
        description: input.description,
        consumed_amount: input.consumed_amount,
        meal_date: mealDate,
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Meal recording failed:', error);
    throw error;
  }
};