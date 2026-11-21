import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useDemoRole } from "../../lib/demoRole";

// Queries cannot write, so opening an assessment is recorded by a mutation. A refused or failed record
// must not break the page, and the ref keeps React StrictMode from writing the same view twice.
function useRecordOnce(
  key: string | undefined,
  run: (role: ReturnType<typeof useDemoRole>) => Promise<unknown>,
) {
  const role = useDemoRole();
  const done = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!key) return;
    const id = `${role}:${key}`;
    if (done.current === id) return;
    done.current = id;
    void run(role).catch(() => undefined);
    // `run` is rebuilt on every render; the key already says when to record again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, role]);
}

export function useRecordView(reviewId: Id<"reviews"> | undefined) {
  const record = useMutation(api.audit.mutations.recordView);
  useRecordOnce(reviewId, (role) =>
    record({ actor: { role }, reviewId: reviewId! }),
  );
}

export function useRecordExport(reviewId: Id<"reviews"> | undefined) {
  const record = useMutation(api.audit.mutations.recordExport);
  useRecordOnce(reviewId, (role) =>
    record({ actor: { role }, reviewId: reviewId! }),
  );
}
