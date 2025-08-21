import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable } from '../db/schema';
import { getChildren } from '../handlers/get_children';

describe('getChildren', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no children exist', async () => {
    const result = await getChildren();
    
    expect(result).toEqual([]);
  });

  it('should return all children from database', async () => {
    // Create test children
    const testChildren = [
      {
        name: 'Alice Smith',
        date_of_birth: new Date('2020-03-15'),
        parent_name: 'John Smith',
        parent_phone: '555-0123',
        parent_email: 'john.smith@example.com',
        emergency_contact: 'Jane Smith',
        emergency_phone: '555-0124'
      },
      {
        name: 'Bob Johnson',
        date_of_birth: new Date('2019-07-22'),
        parent_name: 'Mary Johnson',
        parent_phone: '555-0125',
        parent_email: 'mary.johnson@example.com',
        emergency_contact: 'Tom Johnson',
        emergency_phone: '555-0126'
      },
      {
        name: 'Charlie Brown',
        date_of_birth: new Date('2021-01-10'),
        parent_name: 'Sarah Brown',
        parent_phone: '555-0127',
        parent_email: 'sarah.brown@example.com',
        emergency_contact: 'Mike Brown',
        emergency_phone: '555-0128'
      }
    ];

    await db.insert(childrenTable).values(testChildren).execute();

    const result = await getChildren();

    expect(result).toHaveLength(3);
    
    // Verify each child's data
    const alice = result.find(child => child.name === 'Alice Smith');
    expect(alice).toBeDefined();
    expect(alice!.parent_name).toBe('John Smith');
    expect(alice!.parent_email).toBe('john.smith@example.com');
    expect(alice!.date_of_birth).toBeInstanceOf(Date);
    expect(alice!.created_at).toBeInstanceOf(Date);
    expect(alice!.id).toBeDefined();

    const bob = result.find(child => child.name === 'Bob Johnson');
    expect(bob).toBeDefined();
    expect(bob!.parent_name).toBe('Mary Johnson');
    expect(bob!.emergency_contact).toBe('Tom Johnson');

    const charlie = result.find(child => child.name === 'Charlie Brown');
    expect(charlie).toBeDefined();
    expect(charlie!.parent_phone).toBe('555-0127');
    expect(charlie!.emergency_phone).toBe('555-0128');
  });

  it('should return children with correct field types', async () => {
    const testChild = {
      name: 'Test Child',
      date_of_birth: new Date('2020-06-01'),
      parent_name: 'Test Parent',
      parent_phone: '555-0100',
      parent_email: 'test@example.com',
      emergency_contact: 'Emergency Contact',
      emergency_phone: '555-0101'
    };

    await db.insert(childrenTable).values(testChild).execute();

    const result = await getChildren();

    expect(result).toHaveLength(1);
    const child = result[0];

    // Verify all field types
    expect(typeof child.id).toBe('number');
    expect(typeof child.name).toBe('string');
    expect(child.date_of_birth).toBeInstanceOf(Date);
    expect(typeof child.parent_name).toBe('string');
    expect(typeof child.parent_phone).toBe('string');
    expect(typeof child.parent_email).toBe('string');
    expect(typeof child.emergency_contact).toBe('string');
    expect(typeof child.emergency_phone).toBe('string');
    expect(child.created_at).toBeInstanceOf(Date);
  });

  it('should return children in insertion order', async () => {
    const children = [
      {
        name: 'First Child',
        date_of_birth: new Date('2020-01-01'),
        parent_name: 'First Parent',
        parent_phone: '555-0001',
        parent_email: 'first@example.com',
        emergency_contact: 'First Emergency',
        emergency_phone: '555-0002'
      },
      {
        name: 'Second Child',
        date_of_birth: new Date('2020-02-01'),
        parent_name: 'Second Parent',
        parent_phone: '555-0003',
        parent_email: 'second@example.com',
        emergency_contact: 'Second Emergency',
        emergency_phone: '555-0004'
      }
    ];

    // Insert children one by one to ensure order
    await db.insert(childrenTable).values(children[0]).execute();
    await db.insert(childrenTable).values(children[1]).execute();

    const result = await getChildren();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('First Child');
    expect(result[1].name).toBe('Second Child');
    expect(result[0].id).toBeLessThan(result[1].id);
  });
});