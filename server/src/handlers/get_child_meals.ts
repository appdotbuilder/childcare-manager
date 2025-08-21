import { db } from '../db';
import { mealsTable } from '../db/schema';
import { type GetChildMealsInput, type Meal } from '../schema';
import { eq, and, desc, gte, lt, SQL } from 'drizzle-orm';

export async function getChildMeals(input: GetChildMealsInput): Promise<Meal[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by child_id
    conditions.push(eq(mealsTable.child_id, input.child_id));

    // Add date filter if provided
    if (input.date) {
      const filterDate = typeof input.date === 'string' ? new Date(input.date) : input.date;
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      conditions.push(gte(mealsTable.meal_date, startOfDay));
      conditions.push(lt(mealsTable.meal_date, endOfDay));
    }

    // Add meal_type filter if provided
    if (input.meal_type) {
      conditions.push(eq(mealsTable.meal_type, input.meal_type));
    }

    // Build and execute query
    const results = await db.select()
      .from(mealsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(mealsTable.meal_date))
      .execute();

    // Return results (no numeric conversion needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to get child meals:', error);
    throw error;
  }
}