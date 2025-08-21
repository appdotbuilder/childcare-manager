import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createChildInputSchema,
  updateChildInputSchema,
  checkInInputSchema,
  checkOutInputSchema,
  getChildAttendanceInputSchema,
  recordMealInputSchema,
  getChildMealsInputSchema
} from './schema';

// Import handlers
import { createChild } from './handlers/create_child';
import { getChildren } from './handlers/get_children';
import { getChildById } from './handlers/get_child_by_id';
import { updateChild } from './handlers/update_child';
import { checkInChild } from './handlers/check_in_child';
import { checkOutChild } from './handlers/check_out_child';
import { getChildAttendance } from './handlers/get_child_attendance';
import { getCurrentAttendance } from './handlers/get_current_attendance';
import { recordMeal } from './handlers/record_meal';
import { getChildMeals } from './handlers/get_child_meals';
import { getDailyMeals } from './handlers/get_daily_meals';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Child management
  createChild: publicProcedure
    .input(createChildInputSchema)
    .mutation(({ input }) => createChild(input)),

  getChildren: publicProcedure
    .query(() => getChildren()),

  getChildById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getChildById(input.id)),

  updateChild: publicProcedure
    .input(updateChildInputSchema)
    .mutation(({ input }) => updateChild(input)),

  // Attendance management
  checkInChild: publicProcedure
    .input(checkInInputSchema)
    .mutation(({ input }) => checkInChild(input)),

  checkOutChild: publicProcedure
    .input(checkOutInputSchema)
    .mutation(({ input }) => checkOutChild(input)),

  getChildAttendance: publicProcedure
    .input(getChildAttendanceInputSchema)
    .query(({ input }) => getChildAttendance(input)),

  getCurrentAttendance: publicProcedure
    .query(() => getCurrentAttendance()),

  // Meal management
  recordMeal: publicProcedure
    .input(recordMealInputSchema)
    .mutation(({ input }) => recordMeal(input)),

  getChildMeals: publicProcedure
    .input(getChildMealsInputSchema)
    .query(({ input }) => getChildMeals(input)),

  getDailyMeals: publicProcedure
    .input(z.object({ date: z.string().or(z.date()).optional() }).optional())
    .query(({ input }) => getDailyMeals(input?.date)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();