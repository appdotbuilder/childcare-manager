import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable, mealsTable } from '../db/schema';
import { type RecordMealInput } from '../schema';
import { recordMeal } from '../handlers/record_meal';
import { eq } from 'drizzle-orm';

describe('recordMeal', () => {
  let testChildId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test child first
    const childResult = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '987-654-3210'
      })
      .returning()
      .execute();
    
    testChildId = childResult[0].id;
  });

  afterEach(resetDB);

  const testInput: RecordMealInput = {
    child_id: 0, // Will be set to testChildId in tests
    meal_type: 'lunch',
    description: 'Grilled chicken with vegetables',
    consumed_amount: 'full',
    meal_date: '2023-12-01',
    notes: 'Child enjoyed the meal'
  };

  it('should record a meal with all fields', async () => {
    const input = { ...testInput, child_id: testChildId };
    const result = await recordMeal(input);

    // Basic field validation
    expect(result.child_id).toEqual(testChildId);
    expect(result.meal_type).toEqual('lunch');
    expect(result.description).toEqual('Grilled chicken with vegetables');
    expect(result.consumed_amount).toEqual('full');
    expect(result.meal_date).toBeInstanceOf(Date);
    expect(result.meal_date.toISOString().split('T')[0]).toEqual('2023-12-01');
    expect(result.notes).toEqual('Child enjoyed the meal');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save meal to database', async () => {
    const input = { ...testInput, child_id: testChildId };
    const result = await recordMeal(input);

    // Query database to verify meal was saved
    const meals = await db.select()
      .from(mealsTable)
      .where(eq(mealsTable.id, result.id))
      .execute();

    expect(meals).toHaveLength(1);
    expect(meals[0].child_id).toEqual(testChildId);
    expect(meals[0].meal_type).toEqual('lunch');
    expect(meals[0].description).toEqual('Grilled chicken with vegetables');
    expect(meals[0].consumed_amount).toEqual('full');
    expect(meals[0].meal_date).toBeInstanceOf(Date);
    expect(meals[0].notes).toEqual('Child enjoyed the meal');
    expect(meals[0].created_at).toBeInstanceOf(Date);
  });

  it('should record meal with Date object for meal_date', async () => {
    const mealDate = new Date('2023-11-15');
    const input = {
      ...testInput,
      child_id: testChildId,
      meal_date: mealDate
    };
    
    const result = await recordMeal(input);

    expect(result.meal_date).toBeInstanceOf(Date);
    expect(result.meal_date.toISOString().split('T')[0]).toEqual('2023-11-15');
  });

  it('should use current date when meal_date is not provided', async () => {
    const input = {
      child_id: testChildId,
      meal_type: 'breakfast' as const,
      description: 'Oatmeal with fruit',
      consumed_amount: 'half'
    };

    const result = await recordMeal(input);

    expect(result.meal_date).toBeInstanceOf(Date);
    // Check that the date is within the last few seconds (current date)
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - result.meal_date.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });

  it('should record meal without optional notes', async () => {
    const input = {
      child_id: testChildId,
      meal_type: 'snack' as const,
      description: 'Apple slices',
      consumed_amount: 'some'
    };

    const result = await recordMeal(input);

    expect(result.notes).toBeNull();
    expect(result.meal_type).toEqual('snack');
    expect(result.description).toEqual('Apple slices');
    expect(result.consumed_amount).toEqual('some');
  });

  it('should handle all meal types correctly', async () => {
    const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
    
    for (const mealType of mealTypes) {
      const input = {
        child_id: testChildId,
        meal_type: mealType,
        description: `Test ${mealType}`,
        consumed_amount: 'full'
      };

      const result = await recordMeal(input);
      expect(result.meal_type).toEqual(mealType);
    }
  });

  it('should throw error for non-existent child', async () => {
    const input = {
      ...testInput,
      child_id: 99999 // Non-existent child ID
    };

    expect(recordMeal(input)).rejects.toThrow(/Child with id 99999 not found/i);
  });

  it('should handle different consumed amounts', async () => {
    const amounts = ['full', 'half', 'some', 'none'];
    
    for (const amount of amounts) {
      const input = {
        child_id: testChildId,
        meal_type: 'lunch' as const,
        description: 'Test meal',
        consumed_amount: amount
      };

      const result = await recordMeal(input);
      expect(result.consumed_amount).toEqual(amount);
    }
  });

  it('should record multiple meals for same child', async () => {
    const meals = [
      {
        child_id: testChildId,
        meal_type: 'breakfast' as const,
        description: 'Pancakes',
        consumed_amount: 'full'
      },
      {
        child_id: testChildId,
        meal_type: 'lunch' as const,
        description: 'Sandwich',
        consumed_amount: 'half'
      }
    ];

    for (const mealInput of meals) {
      const result = await recordMeal(mealInput);
      expect(result.child_id).toEqual(testChildId);
      expect(result.meal_type).toEqual(mealInput.meal_type);
    }

    // Verify both meals are in database
    const savedMeals = await db.select()
      .from(mealsTable)
      .where(eq(mealsTable.child_id, testChildId))
      .execute();

    expect(savedMeals).toHaveLength(2);
  });
});