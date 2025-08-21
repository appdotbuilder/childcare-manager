import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable } from '../db/schema';

import { getChildById } from '../handlers/get_child_by_id';

// Test child data
const testChildData = {
  name: 'Alice Johnson',
  date_of_birth: new Date('2018-05-15'),
  parent_name: 'John Johnson',
  parent_phone: '555-0123',
  parent_email: 'john@example.com',
  emergency_contact: 'Jane Johnson',
  emergency_phone: '555-0124'
};

describe('getChildById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a child when found by ID', async () => {
    // Create a test child first
    const insertResult = await db.insert(childrenTable)
      .values(testChildData)
      .returning()
      .execute();

    const createdChild = insertResult[0];

    // Test the handler
    const result = await getChildById(createdChild.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdChild.id);
    expect(result!.name).toEqual('Alice Johnson');
    expect(result!.parent_name).toEqual('John Johnson');
    expect(result!.parent_phone).toEqual('555-0123');
    expect(result!.parent_email).toEqual('john@example.com');
    expect(result!.emergency_contact).toEqual('Jane Johnson');
    expect(result!.emergency_phone).toEqual('555-0124');
    expect(result!.date_of_birth).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when child is not found', async () => {
    const result = await getChildById(999);

    expect(result).toBeNull();
  });

  it('should return the correct child when multiple children exist', async () => {
    // Create multiple test children
    const child1Data = { ...testChildData, name: 'Child One' };
    const child2Data = { ...testChildData, name: 'Child Two', parent_email: 'parent2@example.com' };

    const [child1, child2] = await Promise.all([
      db.insert(childrenTable)
        .values(child1Data)
        .returning()
        .execute()
        .then(result => result[0]),
      
      db.insert(childrenTable)
        .values(child2Data)
        .returning()
        .execute()
        .then(result => result[0])
    ]);

    // Test getting the second child
    const result = await getChildById(child2.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(child2.id);
    expect(result!.name).toEqual('Child Two');
    expect(result!.parent_email).toEqual('parent2@example.com');
    
    // Ensure we didn't get the first child
    expect(result!.id).not.toEqual(child1.id);
    expect(result!.name).not.toEqual('Child One');
  });

  it('should handle edge case with ID 0', async () => {
    const result = await getChildById(0);

    expect(result).toBeNull();
  });

  it('should handle negative ID values', async () => {
    const result = await getChildById(-1);

    expect(result).toBeNull();
  });
});