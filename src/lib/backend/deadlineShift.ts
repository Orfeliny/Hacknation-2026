import { api } from "../../../convex/_generated/api";
import type {
  decideContract,
  getContract,
  listAwaitingNoticeContract,
  listForEmployeeContract,
  listForSupervisorContract,
  markNoticeSentContract,
  ShiftRequest,
} from "../../../convex/lib/contracts/deadlineShift";
import {
  decide,
  deadlineShiftStore,
  markNoticeSent,
} from "./demo/deadlineShift";
import {
  online,
  useDemoMutation,
  useDemoQuery,
  type ArgsOf,
  type QueryResult,
  type ReturnsOf,
  type ViewArgs,
} from "./useDemo";
import { useActorMutation, useActorQuery } from "./useLive";

function useDemoShiftsForSupervisor(): QueryResult<
  ReturnsOf<typeof listForSupervisorContract>
> {
  return useDemoQuery(
    deadlineShiftStore,
    (rows) => rows.filter((r) => r.reason === "employee_request"),
    null,
  );
}

function useDemoShiftsAwaitingNotice(): QueryResult<
  ReturnsOf<typeof listAwaitingNoticeContract>
> {
  return useDemoQuery(
    deadlineShiftStore,
    (rows) =>
      rows.filter(
        (r) => r.status !== "requested" && r.noticeSentAt === undefined,
      ),
    null,
  );
}

function useDemoShiftsForEmployee(
  args: ViewArgs<ArgsOf<typeof listForEmployeeContract>>,
): QueryResult<ReturnsOf<typeof listForEmployeeContract>> {
  return useDemoQuery(
    deadlineShiftStore,
    (rows) =>
      rows
        .filter((r) => r.employeeId === args.employeeId)
        .sort((a, b) => b.createdAt - a.createdAt),
    args,
  );
}

function useDemoShift(
  args: ViewArgs<ArgsOf<typeof getContract>>,
): QueryResult<ReturnsOf<typeof getContract>> {
  return useDemoQuery(
    deadlineShiftStore,
    (rows) =>
      rows.find(
        (r) =>
          r.reviewId === args.reviewId && r.changeIndex === args.changeIndex,
      ) ?? null,
    args,
  );
}

const useDemoDecideShift = () =>
  useDemoMutation<
    ShiftRequest[],
    ArgsOf<typeof decideContract>,
    ReturnsOf<typeof decideContract>
  >(deadlineShiftStore, decide);

const useDemoMarkNoticeSent = () =>
  useDemoMutation<
    ShiftRequest[],
    ArgsOf<typeof markNoticeSentContract>,
    ReturnsOf<typeof markNoticeSentContract>
  >(deadlineShiftStore, markNoticeSent);

const q = api.deadlineShift.queries;
const m = api.deadlineShift.mutations;

const useLiveShiftsForSupervisor = (): QueryResult<
  ReturnsOf<typeof listForSupervisorContract>
> => useActorQuery(q.listForSupervisor, {});

const useLiveShiftsAwaitingNotice = (): QueryResult<
  ReturnsOf<typeof listAwaitingNoticeContract>
> => useActorQuery(q.listAwaitingNotice, {});

const useLiveShiftsForEmployee = (
  args: ViewArgs<ArgsOf<typeof listForEmployeeContract>>,
): QueryResult<ReturnsOf<typeof listForEmployeeContract>> =>
  useActorQuery(q.listForEmployee, args);

const useLiveShift = (
  args: ViewArgs<ArgsOf<typeof getContract>>,
): QueryResult<ReturnsOf<typeof getContract>> => useActorQuery(q.get, args);

const useLiveDecideShift = (): ((
  args: ViewArgs<ArgsOf<typeof decideContract>>,
) => Promise<ReturnsOf<typeof decideContract>>) => useActorMutation(m.decide);

const useLiveMarkNoticeSent = (): ((
  args: ViewArgs<ArgsOf<typeof markNoticeSentContract>>,
) => Promise<ReturnsOf<typeof markNoticeSentContract>>) =>
  useActorMutation(m.markNoticeSent);

export const useShiftsForSupervisor = online
  ? useLiveShiftsForSupervisor
  : useDemoShiftsForSupervisor;
export const useShiftsAwaitingNotice = online
  ? useLiveShiftsAwaitingNotice
  : useDemoShiftsAwaitingNotice;
export const useShiftsForEmployee = online
  ? useLiveShiftsForEmployee
  : useDemoShiftsForEmployee;
export const useShift = online ? useLiveShift : useDemoShift;
export const useDecideShift = online ? useLiveDecideShift : useDemoDecideShift;
export const useMarkNoticeSent = online
  ? useLiveMarkNoticeSent
  : useDemoMarkNoticeSent;
