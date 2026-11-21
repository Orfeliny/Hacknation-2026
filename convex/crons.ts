import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "review reminders",
  { hourUTC: 5, minuteUTC: 0 },
  internal.hrDashboard.reminders.generate,
  {},
);

export default crons;
