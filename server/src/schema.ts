import { z } from 'zod';

// Child schema
export const childSchema = z.object({
  id: z.number(),
  name: z.string(),
  date_of_birth: z.coerce.date(),
  parent_name: z.string(),
  parent_phone: z.string(),
  parent_email: z.string().email(),
  emergency_contact: z.string(),
  emergency_phone: z.string(),
  created_at: z.coerce.date()
});

export type Child = z.infer<typeof childSchema>;

// Input schema for creating children
export const createChildInputSchema = z.object({
  name: z.string().min(1),
  date_of_birth: z.string().or(z.date()),
  parent_name: z.string().min(1),
  parent_phone: z.string().min(1),
  parent_email: z.string().email(),
  emergency_contact: z.string().min(1),
  emergency_phone: z.string().min(1)
});

export type CreateChildInput = z.infer<typeof createChildInputSchema>;

// Input schema for updating children
export const updateChildInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  date_of_birth: z.string().or(z.date()).optional(),
  parent_name: z.string().min(1).optional(),
  parent_phone: z.string().min(1).optional(),
  parent_email: z.string().email().optional(),
  emergency_contact: z.string().min(1).optional(),
  emergency_phone: z.string().min(1).optional()
});

export type UpdateChildInput = z.infer<typeof updateChildInputSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  child_id: z.number(),
  check_in_time: z.coerce.date(),
  check_out_time: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

// Input schema for checking in
export const checkInInputSchema = z.object({
  child_id: z.number(),
  notes: z.string().optional()
});

export type CheckInInput = z.infer<typeof checkInInputSchema>;

// Input schema for checking out
export const checkOutInputSchema = z.object({
  attendance_id: z.number(),
  notes: z.string().optional()
});

export type CheckOutInput = z.infer<typeof checkOutInputSchema>;

// Meal types enum
export const mealTypeEnum = z.enum(['breakfast', 'lunch', 'snack', 'dinner']);
export type MealType = z.infer<typeof mealTypeEnum>;

// Meal schema
export const mealSchema = z.object({
  id: z.number(),
  child_id: z.number(),
  meal_type: mealTypeEnum,
  description: z.string(),
  consumed_amount: z.string(), // e.g., "full", "half", "none", "some"
  meal_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Meal = z.infer<typeof mealSchema>;

// Input schema for recording meals
export const recordMealInputSchema = z.object({
  child_id: z.number(),
  meal_type: mealTypeEnum,
  description: z.string().min(1),
  consumed_amount: z.string().min(1),
  meal_date: z.string().or(z.date()).optional(), // Defaults to current date if not provided
  notes: z.string().optional()
});

export type RecordMealInput = z.infer<typeof recordMealInputSchema>;

// Query schemas for filtering
export const getChildAttendanceInputSchema = z.object({
  child_id: z.number(),
  date: z.string().or(z.date()).optional() // If provided, filter by specific date
});

export type GetChildAttendanceInput = z.infer<typeof getChildAttendanceInputSchema>;

export const getChildMealsInputSchema = z.object({
  child_id: z.number(),
  date: z.string().or(z.date()).optional(), // If provided, filter by specific date
  meal_type: mealTypeEnum.optional()
});

export type GetChildMealsInput = z.infer<typeof getChildMealsInputSchema>;