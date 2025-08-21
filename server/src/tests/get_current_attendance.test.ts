import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable, attendanceTable } from '../db/schema';
import { getCurrentAttendance } from '../handlers/get_current_attendance';

describe('getCurrentAttendance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test child
  const createTestChild = async () => {
    const childResult = await db.insert(childrenTable)
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
    
    return childResult[0];
  };

  // Helper function to create attendance record
  const createAttendanceRecord = async (childId: number, checkedOut = false) => {
    const attendanceData: any = {
      child_id: childId,
      check_in_time: new Date(),
      notes: 'Test attendance'
    };

    if (checkedOut) {
      attendanceData.check_out_time = new Date();
    }

    const result = await db.insert(attendanceTable)
      .values(attendanceData)
      .returning()
      .execute();
    
    return result[0];
  };

  it('should return empty array when no children are checked in', async () => {
    const result = await getCurrentAttendance();
    expect(result).toEqual([]);
  });

  it('should return attendance record for currently checked in child', async () => {
    // Create test child
    const child = await createTestChild();
    
    // Create attendance record (not checked out)
    const attendance = await createAttendanceRecord(child.id, false);

    const result = await getCurrentAttendance();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(attendance.id);
    expect(result[0].child_id).toEqual(child.id);
    expect(result[0].check_in_time).toBeInstanceOf(Date);
    expect(result[0].check_out_time).toBeNull();
    expect(result[0].notes).toEqual('Test attendance');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should not return attendance records for checked out children', async () => {
    // Create test child
    const child = await createTestChild();
    
    // Create attendance record that is checked out
    await createAttendanceRecord(child.id, true);

    const result = await getCurrentAttendance();

    // Should return empty array since child is checked out
    expect(result).toHaveLength(0);
  });

  it('should return multiple attendance records for multiple checked in children', async () => {
    // Create first child and attendance
    const child1 = await createTestChild();
    const attendance1 = await createAttendanceRecord(child1.id, false);

    // Create second child and attendance
    const child2Result = await db.insert(childrenTable)
      .values({
        name: 'Second Child',
        date_of_birth: new Date('2021-01-01'),
        parent_name: 'Second Parent',
        parent_phone: '555-123-4567',
        parent_email: 'parent2@test.com',
        emergency_contact: 'Second Emergency',
        emergency_phone: '555-987-6543'
      })
      .returning()
      .execute();
    const child2 = child2Result[0];
    const attendance2 = await createAttendanceRecord(child2.id, false);

    const result = await getCurrentAttendance();

    expect(result).toHaveLength(2);
    
    // Verify both attendance records are returned
    const attendanceIds = result.map(r => r.id);
    expect(attendanceIds).toContain(attendance1.id);
    expect(attendanceIds).toContain(attendance2.id);

    // Verify all records have null check_out_time
    result.forEach(attendance => {
      expect(attendance.check_out_time).toBeNull();
      expect(attendance.check_in_time).toBeInstanceOf(Date);
      expect(attendance.created_at).toBeInstanceOf(Date);
    });
  });

  it('should only return checked in children when mixed attendance states exist', async () => {
    // Create children
    const child1 = await createTestChild();
    const child2Result = await db.insert(childrenTable)
      .values({
        name: 'Second Child',
        date_of_birth: new Date('2021-01-01'),
        parent_name: 'Second Parent',
        parent_phone: '555-123-4567',
        parent_email: 'parent2@test.com',
        emergency_contact: 'Second Emergency',
        emergency_phone: '555-987-6543'
      })
      .returning()
      .execute();
    const child2 = child2Result[0];

    // Create mixed attendance records
    const checkedInAttendance = await createAttendanceRecord(child1.id, false); // Still checked in
    await createAttendanceRecord(child2.id, true); // Checked out

    const result = await getCurrentAttendance();

    // Should only return the checked-in child
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(checkedInAttendance.id);
    expect(result[0].child_id).toEqual(child1.id);
    expect(result[0].check_out_time).toBeNull();
  });

  it('should handle child with multiple attendance records correctly', async () => {
    // Create test child
    const child = await createTestChild();
    
    // Create multiple attendance records for same child
    // Old record (checked out)
    await createAttendanceRecord(child.id, true);
    
    // Current record (still checked in)
    const currentAttendance = await createAttendanceRecord(child.id, false);

    const result = await getCurrentAttendance();

    // Should only return the current (non-checked-out) record
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(currentAttendance.id);
    expect(result[0].child_id).toEqual(child.id);
    expect(result[0].check_out_time).toBeNull();
  });
});