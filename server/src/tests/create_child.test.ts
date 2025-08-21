import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable } from '../db/schema';
import { type CreateChildInput } from '../schema';
import { createChild } from '../handlers/create_child';
import { eq } from 'drizzle-orm';

// Simple test input with string date
const testInputWithStringDate: CreateChildInput = {
  name: 'John Doe',
  date_of_birth: '2020-05-15',
  parent_name: 'Jane Doe',
  parent_phone: '555-1234',
  parent_email: 'jane.doe@example.com',
  emergency_contact: 'Bob Smith',
  emergency_phone: '555-5678'
};

// Test input with Date object
const testInputWithDateObject: CreateChildInput = {
  name: 'Alice Johnson',
  date_of_birth: new Date('2019-03-22'),
  parent_name: 'Sarah Johnson',
  parent_phone: '555-9999',
  parent_email: 'sarah@example.com',
  emergency_contact: 'Mike Johnson',
  emergency_phone: '555-8888'
};

describe('createChild', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a child with string date', async () => {
    const result = await createChild(testInputWithStringDate);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.parent_name).toEqual('Jane Doe');
    expect(result.parent_phone).toEqual('555-1234');
    expect(result.parent_email).toEqual('jane.doe@example.com');
    expect(result.emergency_contact).toEqual('Bob Smith');
    expect(result.emergency_phone).toEqual('555-5678');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.date_of_birth).toBeInstanceOf(Date);
    expect(result.date_of_birth.toISOString().split('T')[0]).toEqual('2020-05-15');
  });

  it('should create a child with Date object', async () => {
    const result = await createChild(testInputWithDateObject);

    // Basic field validation
    expect(result.name).toEqual('Alice Johnson');
    expect(result.parent_name).toEqual('Sarah Johnson');
    expect(result.parent_phone).toEqual('555-9999');
    expect(result.parent_email).toEqual('sarah@example.com');
    expect(result.emergency_contact).toEqual('Mike Johnson');
    expect(result.emergency_phone).toEqual('555-8888');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.date_of_birth).toBeInstanceOf(Date);
    expect(result.date_of_birth.toISOString().split('T')[0]).toEqual('2019-03-22');
  });

  it('should save child to database', async () => {
    const result = await createChild(testInputWithStringDate);

    // Query using proper drizzle syntax
    const children = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.id, result.id))
      .execute();

    expect(children).toHaveLength(1);
    const child = children[0];
    expect(child.name).toEqual('John Doe');
    expect(child.parent_name).toEqual('Jane Doe');
    expect(child.parent_phone).toEqual('555-1234');
    expect(child.parent_email).toEqual('jane.doe@example.com');
    expect(child.emergency_contact).toEqual('Bob Smith');
    expect(child.emergency_phone).toEqual('555-5678');
    expect(child.date_of_birth).toBeInstanceOf(Date);
    expect(child.created_at).toBeInstanceOf(Date);
  });

  it('should create multiple children with unique IDs', async () => {
    const result1 = await createChild(testInputWithStringDate);
    const result2 = await createChild(testInputWithDateObject);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('John Doe');
    expect(result2.name).toEqual('Alice Johnson');

    // Verify both are saved in database
    const allChildren = await db.select()
      .from(childrenTable)
      .execute();

    expect(allChildren).toHaveLength(2);
    expect(allChildren.map(c => c.name)).toContain('John Doe');
    expect(allChildren.map(c => c.name)).toContain('Alice Johnson');
  });

  it('should handle date conversion correctly', async () => {
    // Test with string date
    const stringResult = await createChild(testInputWithStringDate);
    expect(stringResult.date_of_birth).toBeInstanceOf(Date);
    expect(stringResult.date_of_birth.getFullYear()).toEqual(2020);
    expect(stringResult.date_of_birth.getMonth()).toEqual(4); // May is index 4
    expect(stringResult.date_of_birth.getDate()).toEqual(15);

    // Test with Date object
    const dateResult = await createChild(testInputWithDateObject);
    expect(dateResult.date_of_birth).toBeInstanceOf(Date);
    expect(dateResult.date_of_birth.getFullYear()).toEqual(2019);
    expect(dateResult.date_of_birth.getMonth()).toEqual(2); // March is index 2
    expect(dateResult.date_of_birth.getDate()).toEqual(22);
  });

  it('should set created_at timestamp automatically', async () => {
    const beforeCreate = new Date();
    const result = await createChild(testInputWithStringDate);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at >= beforeCreate).toBe(true);
    expect(result.created_at <= afterCreate).toBe(true);
  });
});