import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type GetChildAttendanceInput, type Attendance } from '../schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getChildAttendance(input: GetChildAttendanceInput): Promise<Attendance[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(attendanceTable.child_id, input.child_id)
    ];

    // If date is provided, filter by specific date (start of day to end of day)
    if (input.date) {
      const filterDate = typeof input.date === 'string' ? new Date(input.date) : input.date;
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      conditions.push(
        gte(attendanceTable.check_in_time, startOfDay),
        lt(attendanceTable.check_in_time, new Date(endOfDay.getTime() + 1)) // Add 1ms to ensure we capture end of day
      );
    }

    // Build and execute the query in one chain
    const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    const results = await db.select()
      .from(attendanceTable)
      .where(whereCondition)
      .orderBy(desc(attendanceTable.check_in_time))
      .execute();

    // Return the results - no numeric conversions needed for this table
    return results;
  } catch (error) {
    console.error('Failed to get child attendance:', error);
    throw error;
  }
}