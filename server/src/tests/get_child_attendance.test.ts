import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { childrenTable, attendanceTable } from '../db/schema';
import { type GetChildAttendanceInput } from '../schema';
import { getChildAttendance } from '../handlers/get_child_attendance';

// Test data setup
const testChild = {
  name: 'Test Child',
  date_of_birth: new Date('2018-01-01'),
  parent_name: 'Test Parent',
  parent_phone: '555-0123',
  parent_email: 'parent@example.com',
  emergency_contact: 'Emergency Contact',
  emergency_phone: '555-0456'
};

const testChild2 = {
  name: 'Another Child',
  date_of_birth: new Date('2019-01-01'),
  parent_name: 'Another Parent',
  parent_phone: '555-0789',
  parent_email: 'parent2@example.com',
  emergency_contact: 'Emergency Contact 2',
  emergency_phone: '555-0101'
};

describe('getChildAttendance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when child has no attendance records', async () => {
    // Create child but no attendance records
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();

    const input: GetChildAttendanceInput = {
      child_id: childResult[0].id
    };

    const result = await getChildAttendance(input);

    expect(result).toEqual([]);
  });

  it('should return attendance records for specific child', async () => {
    // Create two children
    const child1Result = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const child2Result = await db.insert(childrenTable)
      .values(testChild2)
      .returning()
      .execute();

    const child1Id = child1Result[0].id;
    const child2Id = child2Result[0].id;

    // Create attendance records for both children
    const checkInTime1 = new Date('2024-01-15T08:00:00Z');
    const checkInTime2 = new Date('2024-01-15T09:00:00Z');
    const checkInTime3 = new Date('2024-01-15T10:00:00Z');

    await db.insert(attendanceTable).values([
      {
        child_id: child1Id,
        check_in_time: checkInTime1,
        check_out_time: null,
        notes: 'First check-in'
      },
      {
        child_id: child1Id,
        check_in_time: checkInTime2,
        check_out_time: new Date('2024-01-15T17:00:00Z'),
        notes: 'Second check-in'
      },
      {
        child_id: child2Id,
        check_in_time: checkInTime3,
        check_out_time: null,
        notes: 'Other child check-in'
      }
    ]).execute();

    const input: GetChildAttendanceInput = {
      child_id: child1Id
    };

    const result = await getChildAttendance(input);

    // Should return only child1's records, ordered by check_in_time desc
    expect(result).toHaveLength(2);
    expect(result[0].child_id).toBe(child1Id);
    expect(result[1].child_id).toBe(child1Id);
    
    // Check ordering - most recent first
    expect(result[0].check_in_time).toEqual(checkInTime2);
    expect(result[1].check_in_time).toEqual(checkInTime1);
    
    // Check all fields are present
    expect(result[0].id).toBeDefined();
    expect(result[0].notes).toBe('Second check-in');
    expect(result[0].check_out_time).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    expect(result[1].notes).toBe('First check-in');
    expect(result[1].check_out_time).toBeNull();
  });

  it('should filter attendance records by specific date', async () => {
    // Create child
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const childId = childResult[0].id;

    // Create attendance records for different dates
    await db.insert(attendanceTable).values([
      {
        child_id: childId,
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        notes: 'Jan 15 check-in'
      },
      {
        child_id: childId,
        check_in_time: new Date('2024-01-15T16:00:00Z'),
        notes: 'Jan 15 afternoon check-in'
      },
      {
        child_id: childId,
        check_in_time: new Date('2024-01-16T08:00:00Z'),
        notes: 'Jan 16 check-in'
      }
    ]).execute();

    const input: GetChildAttendanceInput = {
      child_id: childId,
      date: '2024-01-15'
    };

    const result = await getChildAttendance(input);

    // Should return only Jan 15 records
    expect(result).toHaveLength(2);
    expect(result[0].notes).toBe('Jan 15 afternoon check-in');
    expect(result[1].notes).toBe('Jan 15 check-in');
    
    // Verify dates are within the specified day
    result.forEach(record => {
      const recordDate = new Date(record.check_in_time);
      expect(recordDate.getFullYear()).toBe(2024);
      expect(recordDate.getMonth()).toBe(0); // January (0-indexed)
      expect(recordDate.getDate()).toBe(15);
    });
  });

  it('should handle date input as Date object', async () => {
    // Create child
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const childId = childResult[0].id;

    // Create attendance record
    await db.insert(attendanceTable).values({
      child_id: childId,
      check_in_time: new Date('2024-01-15T08:00:00Z'),
      notes: 'Jan 15 check-in'
    }).execute();

    const input: GetChildAttendanceInput = {
      child_id: childId,
      date: new Date('2024-01-15')
    };

    const result = await getChildAttendance(input);

    expect(result).toHaveLength(1);
    expect(result[0].notes).toBe('Jan 15 check-in');
  });

  it('should return empty array when no records match date filter', async () => {
    // Create child
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const childId = childResult[0].id;

    // Create attendance record for different date
    await db.insert(attendanceTable).values({
      child_id: childId,
      check_in_time: new Date('2024-01-15T08:00:00Z'),
      notes: 'Jan 15 check-in'
    }).execute();

    const input: GetChildAttendanceInput = {
      child_id: childId,
      date: '2024-01-16'
    };

    const result = await getChildAttendance(input);

    expect(result).toEqual([]);
  });

  it('should handle edge case with attendance at day boundaries', async () => {
    // Create child
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const childId = childResult[0].id;

    // Create attendance records at day boundaries
    await db.insert(attendanceTable).values([
      {
        child_id: childId,
        check_in_time: new Date('2024-01-15T00:00:00Z'), // Start of day
        notes: 'Start of day'
      },
      {
        child_id: childId,
        check_in_time: new Date('2024-01-15T23:59:59Z'), // End of day
        notes: 'End of day'
      },
      {
        child_id: childId,
        check_in_time: new Date('2024-01-16T00:00:00Z'), // Next day
        notes: 'Next day'
      }
    ]).execute();

    const input: GetChildAttendanceInput = {
      child_id: childId,
      date: '2024-01-15'
    };

    const result = await getChildAttendance(input);

    // Should include both start and end of day, but not next day
    expect(result).toHaveLength(2);
    expect(result.some(r => r.notes === 'Start of day')).toBe(true);
    expect(result.some(r => r.notes === 'End of day')).toBe(true);
    expect(result.some(r => r.notes === 'Next day')).toBe(false);
  });

  it('should return attendance records ordered by check_in_time descending', async () => {
    // Create child
    const childResult = await db.insert(childrenTable)
      .values(testChild)
      .returning()
      .execute();
    
    const childId = childResult[0].id;

    // Create attendance records with different times
    const times = [
      new Date('2024-01-15T08:00:00Z'),
      new Date('2024-01-15T12:00:00Z'),
      new Date('2024-01-15T16:00:00Z'),
      new Date('2024-01-15T10:00:00Z')
    ];

    await db.insert(attendanceTable).values(
      times.map((time, index) => ({
        child_id: childId,
        check_in_time: time,
        notes: `Check-in ${index + 1}`
      }))
    ).execute();

    const input: GetChildAttendanceInput = {
      child_id: childId
    };

    const result = await getChildAttendance(input);

    expect(result).toHaveLength(4);
    
    // Verify descending order (most recent first)
    expect(result[0].check_in_time.getTime()).toBeGreaterThan(result[1].check_in_time.getTime());
    expect(result[1].check_in_time.getTime()).toBeGreaterThan(result[2].check_in_time.getTime());
    expect(result[2].check_in_time.getTime()).toBeGreaterThan(result[3].check_in_time.getTime());
    
    // Check specific order
    expect(result[0].check_in_time).toEqual(new Date('2024-01-15T16:00:00Z'));
    expect(result[1].check_in_time).toEqual(new Date('2024-01-15T12:00:00Z'));
    expect(result[2].check_in_time).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result[3].check_in_time).toEqual(new Date('2024-01-15T08:00:00Z'));
  });
});