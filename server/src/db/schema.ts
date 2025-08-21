import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for meal types
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'snack', 'dinner']);

// Children table
export const childrenTable = pgTable('children', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  date_of_birth: timestamp('date_of_birth').notNull(),
  parent_name: text('parent_name').notNull(),
  parent_phone: text('parent_phone').notNull(),
  parent_email: text('parent_email').notNull(),
  emergency_contact: text('emergency_contact').notNull(),
  emergency_phone: text('emergency_phone').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Attendance table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  child_id: integer('child_id').references(() => childrenTable.id).notNull(),
  check_in_time: timestamp('check_in_time').notNull(),
  check_out_time: timestamp('check_out_time'), // Nullable - set when child is checked out
  notes: text('notes'), // Optional notes for check-in/check-out
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Meals table
export const mealsTable = pgTable('meals', {
  id: serial('id').primaryKey(),
  child_id: integer('child_id').references(() => childrenTable.id).notNull(),
  meal_type: mealTypeEnum('meal_type').notNull(),
  description: text('description').notNull(), // What was served
  consumed_amount: text('consumed_amount').notNull(), // How much was consumed
  meal_date: timestamp('meal_date').notNull(), // When the meal was served
  notes: text('notes'), // Optional additional notes
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const childrenRelations = relations(childrenTable, ({ many }) => ({
  attendance: many(attendanceTable),
  meals: many(mealsTable),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  child: one(childrenTable, {
    fields: [attendanceTable.child_id],
    references: [childrenTable.id],
  }),
}));

export const mealsRelations = relations(mealsTable, ({ one }) => ({
  child: one(childrenTable, {
    fields: [mealsTable.child_id],
    references: [childrenTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Child = typeof childrenTable.$inferSelect;
export type NewChild = typeof childrenTable.$inferInsert;
export type Attendance = typeof attendanceTable.$inferSelect;
export type NewAttendance = typeof attendanceTable.$inferInsert;
export type Meal = typeof mealsTable.$inferSelect;
export type NewMeal = typeof mealsTable.$inferInsert;

// Important: Export all tables and relations for proper query building
export const tables = { 
  children: childrenTable,
  attendance: attendanceTable,
  meals: mealsTable
};