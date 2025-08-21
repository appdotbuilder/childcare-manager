import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable, mealsTable } from '../db/schema';
import { getDailyMeals } from '../handlers/get_daily_meals';
import { eq } from 'drizzle-orm';

describe('getDailyMeals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testChild1: any;
  let testChild2: any;
  
  beforeEach(async () => {
    // Create test children first
    const children = await db.insert(childrenTable)
      .values([
        {
          name: 'Alice Johnson',
          date_of_birth: new Date('2018-03-15'),
          parent_name: 'Sarah Johnson',
          parent_phone: '555-0101',
          parent_email: 'sarah@example.com',
          emergency_contact: 'Mike Johnson',
          emergency_phone: '555-0102'
        },
        {
          name: 'Bob Smith',
          date_of_birth: new Date('2017-08-22'),
          parent_name: 'Lisa Smith',
          parent_phone: '555-0201',
          parent_email: 'lisa@example.com',
          emergency_contact: 'Tom Smith',
          emergency_phone: '555-0202'
        }
      ])
      .returning()
      .execute();
    
    testChild1 = children[0];
    testChild2 = children[1];
  });

  it('should return empty array when no meals exist for the date', async () => {
    const result = await getDailyMeals('2023-12-25');
    expect(result).toEqual([]);
  });

  it('should return meals for a specific date', async () => {
    const targetDate = new Date('2024-01-15');
    targetDate.setHours(10, 30, 0, 0); // Set specific time
    
    // Create test meals for the target date
    await db.insert(mealsTable)
      .values([
        {
          child_id: testChild1.id,
          meal_type: 'breakfast',
          description: 'Oatmeal with berries',
          consumed_amount: 'full',
          meal_date: targetDate,
          notes: 'Loved the berries'
        },
        {
          child_id: testChild2.id,
          meal_type: 'breakfast',
          description: 'Toast and eggs',
          consumed_amount: 'half',
          meal_date: targetDate,
          notes: null
        }
      ])
      .execute();

    const result = await getDailyMeals(targetDate);
    
    expect(result).toHaveLength(2);
    
    // Check first meal (should be ordered by child name: Alice comes before Bob)
    const firstMeal = result[0];
    expect(firstMeal.child_id).toEqual(testChild1.id);
    expect(firstMeal.meal_type).toEqual('breakfast');
    expect(firstMeal.description).toEqual('Oatmeal with berries');
    expect(firstMeal.consumed_amount).toEqual('full');
    expect(firstMeal.meal_date).toEqual(targetDate);
    expect(firstMeal.notes).toEqual('Loved the berries');
    expect(firstMeal.id).toBeDefined();
    expect(firstMeal.created_at).toBeInstanceOf(Date);
    
    // Check second meal
    const secondMeal = result[1];
    expect(secondMeal.child_id).toEqual(testChild2.id);
    expect(secondMeal.meal_type).toEqual('breakfast');
    expect(secondMeal.description).toEqual('Toast and eggs');
    expect(secondMeal.consumed_amount).toEqual('half');
    expect(secondMeal.notes).toBeNull();
  });

  it('should default to current date when no date provided', async () => {
    const today = new Date();
    const todayMealTime = new Date();
    todayMealTime.setHours(12, 0, 0, 0); // Noon today
    
    // Create meal for today
    await db.insert(mealsTable)
      .values({
        child_id: testChild1.id,
        meal_type: 'lunch',
        description: 'Sandwich and soup',
        consumed_amount: 'full',
        meal_date: todayMealTime,
        notes: null
      })
      .execute();

    const result = await getDailyMeals(); // No date provided
    
    expect(result).toHaveLength(1);
    expect(result[0].meal_type).toEqual('lunch');
    expect(result[0].description).toEqual('Sandwich and soup');
  });

  it('should handle string date input correctly', async () => {
    const dateString = '2024-01-20';
    const mealDate = new Date(dateString);
    mealDate.setHours(14, 0, 0, 0); // 2 PM
    
    // Create meal for the string date
    await db.insert(mealsTable)
      .values({
        child_id: testChild1.id,
        meal_type: 'snack',
        description: 'Apple slices',
        consumed_amount: 'full',
        meal_date: mealDate,
        notes: 'Healthy choice'
      })
      .execute();

    const result = await getDailyMeals(dateString);
    
    expect(result).toHaveLength(1);
    expect(result[0].meal_type).toEqual('snack');
    expect(result[0].description).toEqual('Apple slices');
    expect(result[0].notes).toEqual('Healthy choice');
  });

  it('should return meals ordered by child name then meal date', async () => {
    const targetDate = new Date('2024-01-25');
    
    // Create multiple meals for both children at different times
    await db.insert(mealsTable)
      .values([
        // Bob's meals (should come second alphabetically)
        {
          child_id: testChild2.id,
          meal_type: 'breakfast',
          description: 'Cereal',
          consumed_amount: 'full',
          meal_date: new Date(targetDate.getTime() + (8 * 60 * 60 * 1000)), // 8 AM
          notes: null
        },
        {
          child_id: testChild2.id,
          meal_type: 'lunch',
          description: 'Pizza',
          consumed_amount: 'half',
          meal_date: new Date(targetDate.getTime() + (12 * 60 * 60 * 1000)), // 12 PM
          notes: null
        },
        // Alice's meals (should come first alphabetically)
        {
          child_id: testChild1.id,
          meal_type: 'lunch',
          description: 'Salad',
          consumed_amount: 'full',
          meal_date: new Date(targetDate.getTime() + (12 * 60 * 60 * 1000)), // 12 PM
          notes: null
        },
        {
          child_id: testChild1.id,
          meal_type: 'breakfast',
          description: 'Pancakes',
          consumed_amount: 'full',
          meal_date: new Date(targetDate.getTime() + (8 * 60 * 60 * 1000)), // 8 AM
          notes: 'Favorite meal'
        }
      ])
      .execute();

    const result = await getDailyMeals(targetDate);
    
    expect(result).toHaveLength(4);
    
    // Should be ordered by child name (Alice first, then Bob), then by meal time
    expect(result[0].child_id).toEqual(testChild1.id); // Alice
    expect(result[0].meal_type).toEqual('breakfast');
    expect(result[0].description).toEqual('Pancakes');
    
    expect(result[1].child_id).toEqual(testChild1.id); // Alice
    expect(result[1].meal_type).toEqual('lunch');
    expect(result[1].description).toEqual('Salad');
    
    expect(result[2].child_id).toEqual(testChild2.id); // Bob
    expect(result[2].meal_type).toEqual('breakfast');
    expect(result[2].description).toEqual('Cereal');
    
    expect(result[3].child_id).toEqual(testChild2.id); // Bob
    expect(result[3].meal_type).toEqual('lunch');
    expect(result[3].description).toEqual('Pizza');
  });

  it('should only return meals from the specified date, not adjacent days', async () => {
    const targetDate = new Date('2024-02-01');
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(targetDate);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    // Create meals on different dates
    await db.insert(mealsTable)
      .values([
        // Day before target date
        {
          child_id: testChild1.id,
          meal_type: 'dinner',
          description: 'Pasta',
          consumed_amount: 'full',
          meal_date: dayBefore,
          notes: null
        },
        // Target date (should be returned)
        {
          child_id: testChild1.id,
          meal_type: 'breakfast',
          description: 'Eggs',
          consumed_amount: 'full',
          meal_date: targetDate,
          notes: null
        },
        // Day after target date
        {
          child_id: testChild1.id,
          meal_type: 'breakfast',
          description: 'Waffles',
          consumed_amount: 'full',
          meal_date: dayAfter,
          notes: null
        }
      ])
      .execute();

    const result = await getDailyMeals(targetDate);
    
    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('Eggs');
    expect(result[0].meal_date).toEqual(targetDate);
  });

  it('should include child information in the response', async () => {
    const targetDate = new Date('2024-03-01');
    
    await db.insert(mealsTable)
      .values({
        child_id: testChild1.id,
        meal_type: 'lunch',
        description: 'Chicken nuggets',
        consumed_amount: 'full',
        meal_date: targetDate,
        notes: 'Asked for seconds'
      })
      .execute();

    const result = await getDailyMeals(targetDate);
    
    expect(result).toHaveLength(1);
    expect(result[0].child_id).toEqual(testChild1.id);
    
    // Verify child information is included (this extends the basic Meal type)
    expect((result[0] as any).child_name).toEqual('Alice Johnson');
    expect((result[0] as any).child_parent_name).toEqual('Sarah Johnson');
  });

  it('should handle meals with all meal types correctly', async () => {
    const targetDate = new Date('2024-03-15');
    
    // Create meals with all different meal types
    await db.insert(mealsTable)
      .values([
        {
          child_id: testChild1.id,
          meal_type: 'breakfast',
          description: 'Oatmeal',
          consumed_amount: 'full',
          meal_date: new Date(targetDate.getTime() + (8 * 60 * 60 * 1000)),
          notes: null
        },
        {
          child_id: testChild1.id,
          meal_type: 'lunch',
          description: 'Sandwich',
          consumed_amount: 'half',
          meal_date: new Date(targetDate.getTime() + (12 * 60 * 60 * 1000)),
          notes: null
        },
        {
          child_id: testChild1.id,
          meal_type: 'snack',
          description: 'Crackers',
          consumed_amount: 'some',
          meal_date: new Date(targetDate.getTime() + (15 * 60 * 60 * 1000)),
          notes: null
        },
        {
          child_id: testChild1.id,
          meal_type: 'dinner',
          description: 'Spaghetti',
          consumed_amount: 'full',
          meal_date: new Date(targetDate.getTime() + (18 * 60 * 60 * 1000)),
          notes: 'Messy but fun'
        }
      ])
      .execute();

    const result = await getDailyMeals(targetDate);
    
    expect(result).toHaveLength(4);
    
    const mealTypes = result.map(meal => meal.meal_type);
    expect(mealTypes).toContain('breakfast');
    expect(mealTypes).toContain('lunch');
    expect(mealTypes).toContain('snack');
    expect(mealTypes).toContain('dinner');
  });
});