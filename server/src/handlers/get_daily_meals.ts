import { db } from '../db';
import { mealsTable, childrenTable } from '../db/schema';
import { type Meal } from '../schema';
import { eq, and, gte, lt, asc } from 'drizzle-orm';

export async function getDailyMeals(date?: string | Date): Promise<Meal[]> {
  try {
    // Default to current date if no date provided
    const targetDate = date ? new Date(date) : new Date();
    
    // Set time to start of day (00:00:00)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Set time to start of next day (00:00:00)
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);

    // Query meals for the specified date with child information
    const results = await db.select()
      .from(mealsTable)
      .innerJoin(childrenTable, eq(mealsTable.child_id, childrenTable.id))
      .where(
        and(
          gte(mealsTable.meal_date, startOfDay),
          lt(mealsTable.meal_date, startOfNextDay)
        )
      )
      .orderBy(asc(childrenTable.name), asc(mealsTable.meal_date))
      .execute();

    // Transform results to include child information in the meal object
    return results.map(result => ({
      id: result.meals.id,
      child_id: result.meals.child_id,
      meal_type: result.meals.meal_type,
      description: result.meals.description,
      consumed_amount: result.meals.consumed_amount,
      meal_date: result.meals.meal_date,
      notes: result.meals.notes,
      created_at: result.meals.created_at,
      // Add child information for display purposes
      child_name: result.children.name,
      child_parent_name: result.children.parent_name
    })) as Meal[];
  } catch (error) {
    console.error('Failed to get daily meals:', error);
    throw error;
  }
}