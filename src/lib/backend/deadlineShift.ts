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

export const useShiftsForSupervisor = online
  ? useDemoShiftsForSupervisor
  : useDemoShiftsForSupervisor;
export const useShiftsAwaitingNotice = online
  ? useDemoShiftsAwaitingNotice
  : useDemoShiftsAwaitingNotice;
export const useShiftsForEmployee = online
  ? useDemoShiftsForEmployee
  : useDemoShiftsForEmployee;
export const useShift = online ? useDemoShift : useDemoShift;
export const useDecideShift = online ? useDemoDecideShift : useDemoDecideShift;
export const useMarkNoticeSent = online
  ? useDemoMarkNoticeSent
  : useDemoMarkNoticeSent;
