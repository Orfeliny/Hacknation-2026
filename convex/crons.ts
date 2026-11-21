import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "review reminders",
  { hourUTC: 5, minuteUTC: 0 },
  internal.hrDashboard.reminders.generate,
  {},
);

crons.daily(
  "regulation watch",
  { hourUTC: 4, minuteUTC: 30 },
  internal.regulationsWatch.actions.check,
  {},
);

export default crons;
