import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type CheckOutInput, type Attendance } from '../schema';
import { eq, isNull } from 'drizzle-orm';

export async function checkOutChild(input: CheckOutInput): Promise<Attendance> {
  try {
    // First, verify the attendance record exists and hasn't already been checked out
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, input.attendance_id))
      .execute();

    if (existingAttendance.length === 0) {
      throw new Error('Attendance record not found');
    }

    const attendance = existingAttendance[0];
    
    if (attendance.check_out_time !== null) {
      throw new Error('Child has already been checked out');
    }

    // Update the attendance record with check-out time and notes
    const result = await db.update(attendanceTable)
      .set({
        check_out_time: new Date(),
        notes: input.notes || attendance.notes // Preserve existing notes if no new notes provided
      })
      .where(eq(attendanceTable.id, input.attendance_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Check-out failed:', error);
    throw error;
  }
}