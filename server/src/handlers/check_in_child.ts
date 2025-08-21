import { db } from '../db';
import { childrenTable, attendanceTable } from '../db/schema';
import { type CheckInInput, type Attendance } from '../schema';
import { eq, isNull, and } from 'drizzle-orm';

export async function checkInChild(input: CheckInInput): Promise<Attendance> {
  try {
    // First verify the child exists
    const child = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.id, input.child_id))
      .execute();

    if (child.length === 0) {
      throw new Error(`Child with ID ${input.child_id} not found`);
    }

    // Check if child is already checked in (has an attendance record with no check_out_time)
    const existingCheckIn = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.child_id, input.child_id),
          isNull(attendanceTable.check_out_time)
        )
      )
      .execute();

    if (existingCheckIn.length > 0) {
      throw new Error(`Child with ID ${input.child_id} is already checked in`);
    }

    // Create new attendance record
    const result = await db.insert(attendanceTable)
      .values({
        child_id: input.child_id,
        check_in_time: new Date(),
        check_out_time: null,
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Child check-in failed:', error);
    throw error;
  }
}