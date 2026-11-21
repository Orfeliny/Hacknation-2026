export type SheetType = "A" | "B" | "C";

export type PositionKind = "office_head" | "managerial" | "non_managerial";

export type ReviewStage =
  | "setup"
  | "opening"
  | "observation"
  | "evaluation"
  | "writing"
  | "signing"
  | "objection_window"
  | "objection"
  | "closed";

export type StaffingSituation = {
  kind: "evaluator_change" | "duties_change" | "long_absence";
  from: string;
  to?: string;
  previousEvaluatorId?: string & { __tableName: "employees" };
  note?: string;
};

export type DeadlineChange = {
  reason:
    | "absence_extension"
    | "evaluator_change"
    | "employee_absence"
    | "evaluator_absence"
    | "employee_request";
  status: "requested" | "approved" | "rejected";
  previousDate: string;
  newDate: string;
  createdAt: number;
  requestedById?: string & { __tableName: "employees" };
  decidedAt?: number;
  noticeSentAt?: number;
};

export type Criterion = {
  id: string;
  name: string;
  description: string;
  kind: "mandatory" | "additional";
  sheets: SheetType[];
  source: string;
};

export type RatingLevel = { id: string; label: string; value: number };

export type RatingScale = { id: string; levels: RatingLevel[] };
