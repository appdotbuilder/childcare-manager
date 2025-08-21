import { db } from '../db';
import { attendanceTable, childrenTable } from '../db/schema';
import { type Attendance } from '../schema';
import { eq, isNull } from 'drizzle-orm';

export async function getCurrentAttendance(): Promise<Attendance[]> {
  try {
    // Query attendance records where check_out_time is null (currently checked in)
    // Join with children table to include child information
    const results = await db.select({
      id: attendanceTable.id,
      child_id: attendanceTable.child_id,
      check_in_time: attendanceTable.check_in_time,
      check_out_time: attendanceTable.check_out_time,
      notes: attendanceTable.notes,
      created_at: attendanceTable.created_at,
      // Include child information for display purposes
      child_name: childrenTable.name,
      parent_name: childrenTable.parent_name,
      parent_phone: childrenTable.parent_phone,
      parent_email: childrenTable.parent_email
    })
    .from(attendanceTable)
    .innerJoin(childrenTable, eq(attendanceTable.child_id, childrenTable.id))
    .where(isNull(attendanceTable.check_out_time))
    .execute();

    // Transform results to match Attendance schema
    return results.map(result => ({
      id: result.id,
      child_id: result.child_id,
      check_in_time: result.check_in_time,
      check_out_time: result.check_out_time,
      notes: result.notes,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch current attendance:', error);
    throw error;
  }
}