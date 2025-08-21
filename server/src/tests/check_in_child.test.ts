import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable, attendanceTable } from '../db/schema';
import { type CheckInInput } from '../schema';
import { checkInChild } from '../handlers/check_in_child';
import { eq, isNull, and } from 'drizzle-orm';

// Test data
const testChild = {
  name: 'Test Child',
  date_of_birth: new Date('2020-01-15'),
  parent_name: 'Test Parent',
  parent_phone: '555-0123',
  parent_email: 'parent@example.com',
  emergency_contact: 'Emergency Contact',
  emergency_phone: '555-9999'
};

const testCheckInInput: CheckInInput = {
  child_id: 1,
  notes: 'Child checked in on time'
};

describe('checkInChild', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should check in a child successfully', async () => {
    // Create prerequisite child record
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const createdChild = childResult[0];
    
    const checkInInput: CheckInInput = {
      child_id: createdChild.id,
      notes: 'Child checked in on time'
    };

    const result = await checkInChild(checkInInput);

    // Verify basic fields
    expect(result.child_id).toEqual(createdChild.id);
    expect(result.check_in_time).toBeInstanceOf(Date);
    expect(result.check_out_time).toBeNull();
    expect(result.notes).toEqual('Child checked in on time');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save attendance record to database', async () => {
    // Create prerequisite child record
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const createdChild = childResult[0];
    
    const checkInInput: CheckInInput = {
      child_id: createdChild.id,
      notes: 'Test check-in'
    };

    const result = await checkInChild(checkInInput);

    // Verify record exists in database
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, result.id))
      .execute();

    expect(attendanceRecords).toHaveLength(1);
    expect(attendanceRecords[0].child_id).toEqual(createdChild.id);
    expect(attendanceRecords[0].check_in_time).toBeInstanceOf(Date);
    expect(attendanceRecords[0].check_out_time).toBeNull();
    expect(attendanceRecords[0].notes).toEqual('Test check-in');
  });

  it('should work without notes', async () => {
    // Create prerequisite child record
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const createdChild = childResult[0];
    
    const checkInInput: CheckInInput = {
      child_id: createdChild.id
      // No notes provided
    };

    const result = await checkInChild(checkInInput);

    expect(result.child_id).toEqual(createdChild.id);
    expect(result.notes).toBeNull();
    expect(result.check_in_time).toBeInstanceOf(Date);
  });

  it('should throw error when child does not exist', async () => {
    const checkInInput: CheckInInput = {
      child_id: 999, // Non-existent child ID
      notes: 'Should fail'
    };

    expect(checkInChild(checkInInput)).rejects.toThrow(/child with id 999 not found/i);
  });

  it('should throw error when child is already checked in', async () => {
    // Create prerequisite child record
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const createdChild = childResult[0];

    // First check-in
    const firstCheckIn: CheckInInput = {
      child_id: createdChild.id,
      notes: 'First check-in'
    };
    
    await checkInChild(firstCheckIn);

    // Try to check in again
    const secondCheckIn: CheckInInput = {
      child_id: createdChild.id,
      notes: 'Second check-in attempt'
    };

    expect(checkInChild(secondCheckIn)).rejects.toThrow(/already checked in/i);
  });

  it('should allow check-in after previous check-out', async () => {
    // Create prerequisite child record
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const createdChild = childResult[0];

    // First check-in
    const firstCheckIn: CheckInInput = {
      child_id: createdChild.id,
      notes: 'First check-in'
    };
    
    const firstResult = await checkInChild(firstCheckIn);

    // Simulate check-out by updating the record
    await db.update(attendanceTable)
      .set({ check_out_time: new Date() })
      .where(eq(attendanceTable.id, firstResult.id))
      .execute();

    // Second check-in should now work
    const secondCheckIn: CheckInInput = {
      child_id: createdChild.id,
      notes: 'Second check-in after check-out'
    };

    const secondResult = await checkInChild(secondCheckIn);

    expect(secondResult.child_id).toEqual(createdChild.id);
    expect(secondResult.notes).toEqual('Second check-in after check-out');
    expect(secondResult.id).not.toEqual(firstResult.id); // Should be a new record
  });

  it('should set check_in_time to current time', async () => {
    // Create prerequisite child record
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const createdChild = childResult[0];
    
    const beforeCheckIn = new Date();
    
    const checkInInput: CheckInInput = {
      child_id: createdChild.id,
      notes: 'Time check'
    };

    const result = await checkInChild(checkInInput);
    const afterCheckIn = new Date();

    // Check-in time should be between before and after timestamps
    expect(result.check_in_time >= beforeCheckIn).toBe(true);
    expect(result.check_in_time <= afterCheckIn).toBe(true);
  });
});