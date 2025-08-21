import { db } from '../db';
import { childrenTable } from '../db/schema';
import { type UpdateChildInput, type Child } from '../schema';
import { eq } from 'drizzle-orm';

export const updateChild = async (input: UpdateChildInput): Promise<Child> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.date_of_birth !== undefined) {
      updateData.date_of_birth = typeof input.date_of_birth === 'string' 
        ? new Date(input.date_of_birth) 
        : input.date_of_birth;
    }
    
    if (input.parent_name !== undefined) {
      updateData.parent_name = input.parent_name;
    }
    
    if (input.parent_phone !== undefined) {
      updateData.parent_phone = input.parent_phone;
    }
    
    if (input.parent_email !== undefined) {
      updateData.parent_email = input.parent_email;
    }
    
    if (input.emergency_contact !== undefined) {
      updateData.emergency_contact = input.emergency_contact;
    }
    
    if (input.emergency_phone !== undefined) {
      updateData.emergency_phone = input.emergency_phone;
    }

    // If no fields to update, just return the existing child
    if (Object.keys(updateData).length === 0) {
      const existing = await db.select()
        .from(childrenTable)
        .where(eq(childrenTable.id, input.id))
        .execute();
      
      if (existing.length === 0) {
        throw new Error(`Child with id ${input.id} not found`);
      }
      
      return existing[0];
    }

    // Update the child record
    const result = await db.update(childrenTable)
      .set(updateData)
      .where(eq(childrenTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Child with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Child update failed:', error);
    throw error;
  }
};