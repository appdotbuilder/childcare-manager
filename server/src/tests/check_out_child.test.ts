import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable, attendanceTable } from '../db/schema';
import { type CheckOutInput } from '../schema';
import { checkOutChild } from '../handlers/check_out_child';
import { eq } from 'drizzle-orm';

// Test data
const testChild = {
  name: 'Test Child',
  date_of_birth: new Date('2020-01-01'),
  parent_name: 'Test Parent',
  parent_phone: '123-456-7890',
  parent_email: 'parent@test.com',
  emergency_contact: 'Emergency Contact',
  emergency_phone: '098-765-4321'
};

describe('checkOutChild', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should check out a child successfully', async () => {
    // Create a child first
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    const child = childResult[0];

    // Create an attendance record (check-in)
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        child_id: child.id,
        check_in_time: new Date(),
        notes: 'Initial check-in notes'
      })
      .returning()
      .execute();
    const attendance = attendanceResult[0];

    const checkOutInput: CheckOutInput = {
      attendance_id: attendance.id,
      notes: 'Check-out notes'
    };

    const result = await checkOutChild(checkOutInput);

    // Verify the result
    expect(result.id).toBe(attendance.id);
    expect(result.child_id).toBe(child.id);
    expect(result.check_in_time).toBeInstanceOf(Date);
    expect(result.check_out_time).toBeInstanceOf(Date);
    expect(result.check_out_time).not.toBe(null);
    expect(result.notes).toBe('Check-out notes');
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify check-out time is after check-in time
    expect(result.check_out_time!.getTime()).toBeGreaterThanOrEqual(result.check_in_time.getTime());
  });

  it('should preserve existing notes when no new notes provided', async () => {
    // Create a child first
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    const child = childResult[0];

    // Create an attendance record with initial notes
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        child_id: child.id,
        check_in_time: new Date(),
        notes: 'Original check-in notes'
      })
      .returning()
      .execute();
    const attendance = attendanceResult[0];

    const checkOutInput: CheckOutInput = {
      attendance_id: attendance.id
      // No notes provided
    };

    const result = await checkOutChild(checkOutInput);

    // Should preserve original notes
    expect(result.notes).toBe('Original check-in notes');
  });

  it('should save check-out time to database', async () => {
    // Create a child first
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    const child = childResult[0];

    // Create an attendance record
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        child_id: child.id,
        check_in_time: new Date()
      })
      .returning()
      .execute();
    const attendance = attendanceResult[0];

    const checkOutInput: CheckOutInput = {
      attendance_id: attendance.id,
      notes: 'Database test notes'
    };

    const result = await checkOutChild(checkOutInput);

    // Query the database to verify the update
    const updatedAttendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, attendance.id))
      .execute();

    expect(updatedAttendance).toHaveLength(1);
    const dbRecord = updatedAttendance[0];
    expect(dbRecord.check_out_time).not.toBe(null);
    expect(dbRecord.check_out_time).toBeInstanceOf(Date);
    expect(dbRecord.notes).toBe('Database test notes');
  });

  it('should throw error when attendance record not found', async () => {
    const checkOutInput: CheckOutInput = {
      attendance_id: 99999 // Non-existent ID
    };

    await expect(checkOutChild(checkOutInput)).rejects.toThrow(/attendance record not found/i);
  });

  it('should throw error when child already checked out', async () => {
    // Create a child first
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    const child = childResult[0];

    // Create an attendance record that's already checked out
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        child_id: child.id,
        check_in_time: new Date(),
        check_out_time: new Date(), // Already checked out
        notes: 'Already checked out'
      })
      .returning()
      .execute();
    const attendance = attendanceResult[0];

    const checkOutInput: CheckOutInput = {
      attendance_id: attendance.id
    };

    await expect(checkOutChild(checkOutInput)).rejects.toThrow(/already been checked out/i);
  });

  it('should handle check-out without notes when record has no existing notes', async () => {
    // Create a child first
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    const child = childResult[0];

    // Create an attendance record without notes
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        child_id: child.id,
        check_in_time: new Date()
        // No notes field - should be null
      })
      .returning()
      .execute();
    const attendance = attendanceResult[0];

    const checkOutInput: CheckOutInput = {
      attendance_id: attendance.id
      // No notes provided
    };

    const result = await checkOutChild(checkOutInput);

    expect(result.notes).toBe(null);
    expect(result.check_out_time).not.toBe(null);
    expect(result.check_out_time).toBeInstanceOf(Date);
  });
});