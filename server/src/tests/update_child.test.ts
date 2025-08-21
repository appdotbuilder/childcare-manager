import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable } from '../db/schema';
import { type UpdateChildInput } from '../schema';
import { updateChild } from '../handlers/update_child';
import { eq } from 'drizzle-orm';

// Create a test child first for updating
const createTestChild = async () => {
  const result = await db.insert(childrenTable)
    .values({
      name: 'Original Child',
      date_of_birth: new Date('2020-01-15'),
      parent_name: 'Original Parent',
      parent_phone: '555-0001',
      parent_email: 'original@example.com',
      emergency_contact: 'Original Emergency',
      emergency_phone: '555-0002'
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateChild', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a child', async () => {
    const testChild = await createTestChild();
    
    const updateInput: UpdateChildInput = {
      id: testChild.id,
      name: 'Updated Child',
      date_of_birth: new Date('2020-03-20'),
      parent_name: 'Updated Parent',
      parent_phone: '555-1001',
      parent_email: 'updated@example.com',
      emergency_contact: 'Updated Emergency',
      emergency_phone: '555-1002'
    };

    const result = await updateChild(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(testChild.id);
    expect(result.name).toEqual('Updated Child');
    expect(result.date_of_birth).toEqual(new Date('2020-03-20'));
    expect(result.parent_name).toEqual('Updated Parent');
    expect(result.parent_phone).toEqual('555-1001');
    expect(result.parent_email).toEqual('updated@example.com');
    expect(result.emergency_contact).toEqual('Updated Emergency');
    expect(result.emergency_phone).toEqual('555-1002');
    expect(result.created_at).toEqual(testChild.created_at); // Should remain unchanged
  });

  it('should update only provided fields', async () => {
    const testChild = await createTestChild();
    
    const updateInput: UpdateChildInput = {
      id: testChild.id,
      name: 'Partially Updated Child',
      parent_email: 'partially.updated@example.com'
    };

    const result = await updateChild(updateInput);

    // Verify only specified fields were updated
    expect(result.id).toEqual(testChild.id);
    expect(result.name).toEqual('Partially Updated Child');
    expect(result.parent_email).toEqual('partially.updated@example.com');
    
    // Verify other fields remained unchanged
    expect(result.date_of_birth).toEqual(testChild.date_of_birth);
    expect(result.parent_name).toEqual(testChild.parent_name);
    expect(result.parent_phone).toEqual(testChild.parent_phone);
    expect(result.emergency_contact).toEqual(testChild.emergency_contact);
    expect(result.emergency_phone).toEqual(testChild.emergency_phone);
    expect(result.created_at).toEqual(testChild.created_at);
  });

  it('should save updated child to database', async () => {
    const testChild = await createTestChild();
    
    const updateInput: UpdateChildInput = {
      id: testChild.id,
      name: 'Database Updated Child',
      parent_phone: '555-9999'
    };

    await updateChild(updateInput);

    // Query database to verify changes were persisted
    const children = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.id, testChild.id))
      .execute();

    expect(children).toHaveLength(1);
    expect(children[0].name).toEqual('Database Updated Child');
    expect(children[0].parent_phone).toEqual('555-9999');
    expect(children[0].parent_name).toEqual('Original Parent'); // Unchanged
  });

  it('should handle date_of_birth as string input', async () => {
    const testChild = await createTestChild();
    
    const updateInput: UpdateChildInput = {
      id: testChild.id,
      date_of_birth: '2021-06-15' // String input
    };

    const result = await updateChild(updateInput);

    expect(result.date_of_birth).toEqual(new Date('2021-06-15'));
    expect(result.date_of_birth).toBeInstanceOf(Date);
  });

  it('should handle date_of_birth as Date input', async () => {
    const testChild = await createTestChild();
    const dateObj = new Date('2021-12-25');
    
    const updateInput: UpdateChildInput = {
      id: testChild.id,
      date_of_birth: dateObj // Date object input
    };

    const result = await updateChild(updateInput);

    expect(result.date_of_birth).toEqual(dateObj);
    expect(result.date_of_birth).toBeInstanceOf(Date);
  });

  it('should throw error when child does not exist', async () => {
    const updateInput: UpdateChildInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Child'
    };

    await expect(updateChild(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle update with no optional fields provided', async () => {
    const testChild = await createTestChild();
    
    const updateInput: UpdateChildInput = {
      id: testChild.id
    };

    const result = await updateChild(updateInput);

    // All fields should remain unchanged
    expect(result.id).toEqual(testChild.id);
    expect(result.name).toEqual(testChild.name);
    expect(result.date_of_birth).toEqual(testChild.date_of_birth);
    expect(result.parent_name).toEqual(testChild.parent_name);
    expect(result.parent_phone).toEqual(testChild.parent_phone);
    expect(result.parent_email).toEqual(testChild.parent_email);
    expect(result.emergency_contact).toEqual(testChild.emergency_contact);
    expect(result.emergency_phone).toEqual(testChild.emergency_phone);
    expect(result.created_at).toEqual(testChild.created_at);
  });

  it('should update multiple children independently', async () => {
    // Create two test children
    const child1 = await createTestChild();
    const child2 = await db.insert(childrenTable)
      .values({
        name: 'Second Child',
        date_of_birth: new Date('2019-05-10'),
        parent_name: 'Second Parent',
        parent_phone: '555-0003',
        parent_email: 'second@example.com',
        emergency_contact: 'Second Emergency',
        emergency_phone: '555-0004'
      })
      .returning()
      .execute();
    
    // Update first child
    await updateChild({
      id: child1.id,
      name: 'Updated First Child'
    });
    
    // Update second child
    await updateChild({
      id: child2[0].id,
      name: 'Updated Second Child'
    });
    
    // Verify both children were updated correctly
    const updatedChildren = await db.select()
      .from(childrenTable)
      .execute();
    
    expect(updatedChildren).toHaveLength(2);
    
    const firstChild = updatedChildren.find(c => c.id === child1.id);
    const secondChild = updatedChildren.find(c => c.id === child2[0].id);
    
    expect(firstChild?.name).toEqual('Updated First Child');
    expect(secondChild?.name).toEqual('Updated Second Child');
  });
});