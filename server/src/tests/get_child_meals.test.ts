import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable, mealsTable } from '../db/schema';
import { type GetChildMealsInput } from '../schema';
import { getChildMeals } from '../handlers/get_child_meals';

describe('getChildMeals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return meals for specific child', async () => {
    // Create test child
    const [child] = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    // Create test meals for the child
    await db.insert(mealsTable)
      .values([
        {
          child_id: child.id,
          meal_type: 'breakfast',
          description: 'Cereal and milk',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-01T08:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'lunch',
          description: 'Sandwich and fruit',
          consumed_amount: 'half',
          meal_date: new Date('2023-12-01T12:00:00Z')
        }
      ])
      .execute();

    // Create meal for different child (should not be returned)
    const [otherChild] = await db.insert(childrenTable)
      .values({
        name: 'Other Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Other Parent',
        parent_phone: '123-456-7890',
        parent_email: 'other@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    await db.insert(mealsTable)
      .values({
        child_id: otherChild.id,
        meal_type: 'snack',
        description: 'Crackers',
        consumed_amount: 'full',
        meal_date: new Date('2023-12-01T10:00:00Z')
      })
      .execute();

    const input: GetChildMealsInput = {
      child_id: child.id
    };

    const result = await getChildMeals(input);

    expect(result).toHaveLength(2);
    expect(result[0].child_id).toEqual(child.id);
    expect(result[1].child_id).toEqual(child.id);
    
    // Should be ordered by meal_date descending (lunch first, then breakfast)
    expect(result[0].meal_type).toEqual('lunch');
    expect(result[1].meal_type).toEqual('breakfast');
    
    // Verify all fields are present
    expect(result[0].id).toBeDefined();
    expect(result[0].description).toEqual('Sandwich and fruit');
    expect(result[0].consumed_amount).toEqual('half');
    expect(result[0].meal_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter meals by specific date', async () => {
    // Create test child
    const [child] = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    // Create meals on different dates
    await db.insert(mealsTable)
      .values([
        {
          child_id: child.id,
          meal_type: 'breakfast',
          description: 'Cereal - Dec 1',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-01T08:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'lunch',
          description: 'Sandwich - Dec 1',
          consumed_amount: 'half',
          meal_date: new Date('2023-12-01T12:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'breakfast',
          description: 'Toast - Dec 2',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-02T08:00:00Z')
        }
      ])
      .execute();

    const input: GetChildMealsInput = {
      child_id: child.id,
      date: new Date('2023-12-01')
    };

    const result = await getChildMeals(input);

    expect(result).toHaveLength(2);
    expect(result[0].description).toEqual('Sandwich - Dec 1');
    expect(result[1].description).toEqual('Cereal - Dec 1');
    
    // Verify all meals are from December 1st
    result.forEach(meal => {
      const mealDate = new Date(meal.meal_date);
      expect(mealDate.getUTCDate()).toEqual(1);
      expect(mealDate.getUTCMonth()).toEqual(11); // December is month 11
    });
  });

  it('should filter meals by meal type', async () => {
    // Create test child
    const [child] = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    // Create different meal types
    await db.insert(mealsTable)
      .values([
        {
          child_id: child.id,
          meal_type: 'breakfast',
          description: 'Cereal',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-01T08:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'lunch',
          description: 'Sandwich',
          consumed_amount: 'half',
          meal_date: new Date('2023-12-01T12:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'snack',
          description: 'Crackers',
          consumed_amount: 'some',
          meal_date: new Date('2023-12-01T15:00:00Z')
        }
      ])
      .execute();

    const input: GetChildMealsInput = {
      child_id: child.id,
      meal_type: 'breakfast'
    };

    const result = await getChildMeals(input);

    expect(result).toHaveLength(1);
    expect(result[0].meal_type).toEqual('breakfast');
    expect(result[0].description).toEqual('Cereal');
    expect(result[0].consumed_amount).toEqual('full');
  });

  it('should filter by both date and meal type', async () => {
    // Create test child
    const [child] = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    // Create meals across different dates and types
    await db.insert(mealsTable)
      .values([
        {
          child_id: child.id,
          meal_type: 'breakfast',
          description: 'Cereal - Dec 1',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-01T08:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'breakfast',
          description: 'Toast - Dec 2',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-02T08:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'lunch',
          description: 'Sandwich - Dec 1',
          consumed_amount: 'half',
          meal_date: new Date('2023-12-01T12:00:00Z')
        }
      ])
      .execute();

    const input: GetChildMealsInput = {
      child_id: child.id,
      date: new Date('2023-12-01'),
      meal_type: 'breakfast'
    };

    const result = await getChildMeals(input);

    expect(result).toHaveLength(1);
    expect(result[0].meal_type).toEqual('breakfast');
    expect(result[0].description).toEqual('Cereal - Dec 1');
    
    // Verify it's from the correct date
    const mealDate = new Date(result[0].meal_date);
    expect(mealDate.getUTCDate()).toEqual(1);
    expect(mealDate.getUTCMonth()).toEqual(11); // December is month 11
  });

  it('should return empty array when no meals found', async () => {
    // Create test child
    const [child] = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    const input: GetChildMealsInput = {
      child_id: child.id
    };

    const result = await getChildMeals(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle date as string input', async () => {
    // Create test child
    const [child] = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    // Create test meal
    await db.insert(mealsTable)
      .values({
        child_id: child.id,
        meal_type: 'breakfast',
        description: 'Cereal',
        consumed_amount: 'full',
        meal_date: new Date('2023-12-01T08:00:00Z')
      })
      .execute();

    const input: GetChildMealsInput = {
      child_id: child.id,
      date: '2023-12-01' // String date
    };

    const result = await getChildMeals(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('Cereal');
  });

  it('should return meals ordered by meal_date descending', async () => {
    // Create test child
    const [child] = await db.insert(childrenTable)
      .values({
        name: 'Test Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'Test Parent',
        parent_phone: '123-456-7890',
        parent_email: 'parent@test.com',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '098-765-4321'
      })
      .returning()
      .execute();

    // Create meals with different times (insert in random order)
    await db.insert(mealsTable)
      .values([
        {
          child_id: child.id,
          meal_type: 'breakfast',
          description: 'Early breakfast',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-01T06:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'dinner',
          description: 'Late dinner',
          consumed_amount: 'full',
          meal_date: new Date('2023-12-01T20:00:00Z')
        },
        {
          child_id: child.id,
          meal_type: 'lunch',
          description: 'Mid lunch',
          consumed_amount: 'half',
          meal_date: new Date('2023-12-01T12:00:00Z')
        }
      ])
      .execute();

    const input: GetChildMealsInput = {
      child_id: child.id
    };

    const result = await getChildMeals(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by meal_date descending (most recent first)
    expect(result[0].description).toEqual('Late dinner');   // 20:00
    expect(result[1].description).toEqual('Mid lunch');     // 12:00
    expect(result[2].description).toEqual('Early breakfast'); // 06:00
    
    // Verify actual ordering by comparing dates
    expect(result[0].meal_date.getTime()).toBeGreaterThan(result[1].meal_date.getTime());
    expect(result[1].meal_date.getTime()).toBeGreaterThan(result[2].meal_date.getTime());
  });
});