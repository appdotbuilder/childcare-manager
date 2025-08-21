import { db } from '../db';
import { childrenTable } from '../db/schema';
import { type CreateChildInput, type Child } from '../schema';

export const createChild = async (input: CreateChildInput): Promise<Child> => {
  try {
    // Convert date string to Date object if needed
    const dateOfBirth = typeof input.date_of_birth === 'string' 
      ? new Date(input.date_of_birth) 
      : input.date_of_birth;

    // Insert child record
    const result = await db.insert(childrenTable)
      .values({
        name: input.name,
        date_of_birth: dateOfBirth,
        parent_name: input.parent_name,
        parent_phone: input.parent_phone,
        parent_email: input.parent_email,
        emergency_contact: input.emergency_contact,
        emergency_phone: input.emergency_phone
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Child creation failed:', error);
    throw error;
  }
};