import { useState } from "react";
import { RouteLink, useRouteRegistered } from "../../app/index";
import { AiBadge } from "../../components/ui/AiBadge";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import {
  useDraftsForReview,
  useEditDraft,
  useGenerateDraft,
  useSetDraftStatus,
  type DraftListing,
} from "../../lib/backend/iprz";
import { formatDate } from "../../lib/format";
import { errorMessage, type ReviewView } from "./types";
import { useAiMode } from "./useAiMode";

type Draft = DraftListing["drafts"][number];

const SECTION_LABELS: Record<Draft["section"], string> = {
  criterion_justification: "Uzasadnienie kryterium",
  strength: "Mocna strona",
  development_area: "Obszar do rozwoju",
  development_action: "Działanie rozwojowe",
  feedback_tip: "Wskazówka do rozmowy",
};

const STATUS_LABELS: Record<Draft["status"], string> = {
  proposed: "Do decyzji",
  accepted: "Zaakceptowana",
  edited: "Zmieniona przez Ciebie",
  rejected: "Odrzucona",
};

function Evidence({
  draft,
  listing,
  employeeId,
}: {
  draft: Draft;
  listing: DraftListing;
  employeeId: string;
}) {
  const registered = useRouteRegistered("/obserwacje");
  const items = (draft.observationIds ?? [])
    .map((id) => listing.evidence.find((e) => e.id === id))
    .filter((e) => e !== undefined);
  if (draft.noEvidence || items.length === 0) {
    return <p className="text-muted text-sm">brak podstawy w obserwacjach</p>;
  }
  const to = `/obserwacje?pracownik=${encodeURIComponent(employeeId)}`;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span>Podstawa w obserwacjach:</span>
      {items.map((e) =>
        registered ? (
          <RouteLink key={e.id} to={to} className="text-primary underline">
            {formatDate(e.date)}
          </RouteLink>
        ) : (
          <span key={e.id} className="font-semibold">
            {formatDate(e.date)}
          </span>
        ),
      )}
    </p>
  );
}

function Fragment({
  draft,
  label,
  listing,
  employeeId,
  pending,
  onDecide,
  onSaveEdit,
}: {
  draft: Draft;
  label: string;
  listing: DraftListing;
  employeeId: string;
  pending: boolean;
  onDecide: (status: "accepted" | "rejected") => void;
  onSaveEdit: (text: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text);
  const rejected = draft.status === "rejected";
  return (
    <li className="border-divider space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{label}</span>
        <Badge>{STATUS_LABELS[draft.status]}</Badge>
      </div>
      {editing ? (
        <Textarea
          rows={3}
          aria-label={`Treść podpowiedzi: ${label}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <p className={rejected ? "text-muted line-through" : undefined}>
          {draft.text}
        </p>
      )}
      {draft.inconsistency && (
        <StatusAlert tone="warning" live={false}>
          {draft.inconsistency}
        </StatusAlert>
      )}
      <Evidence draft={draft} listing={listing} employeeId={employeeId} />
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button
              disabled={pending || text.trim() === ""}
              onClick={() =>
                void onSaveEdit(text).then(() => setEditing(false))
              }
            >
              {`Zapisz zmiany: ${label}`}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setText(draft.text);
                setEditing(false);
              }}
            >
              {`Anuluj edycję: ${label}`}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              disabled={pending || draft.status === "accepted"}
              onClick={() => onDecide("accepted")}
            >
              {`Zaakceptuj: ${label}`}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              {`Edytuj: ${label}`}
            </Button>
            <Button
              variant="secondary"
              disabled={pending || rejected}
              onClick={() => onDecide("rejected")}
            >
              {`Odrzuć: ${label}`}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function AiHintsPanel({ view }: { view: ReviewView }) {
  const reviewId = view.review._id;
  const listing = useDraftsForReview({ reviewId });
  const generate = useGenerateDraft();
  const setStatus = useSetDraftStatus();
  const editDraft = useEditDraft();
  const mode = useAiMode();
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const run = async (task: () => Promise<unknown>) => {
    setPending(true);
    setError(undefined);
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const data = listing.data;
  const counters: Partial<Record<Draft["section"], number>> = {};
  const fragments = (data?.drafts ?? []).map((draft) => {
    const n = (counters[draft.section] ?? 0) + 1;
    counters[draft.section] = n;
    return { draft, label: `${SECTION_LABELS[draft.section]} ${n}` };
  });

  return (
    <section
      aria-labelledby="ai-hints-heading"
      className="border-divider space-y-3 rounded-md border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id="ai-hints-heading" className="text-base font-semibold">
          Podpowiedzi do uzasadnienia
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <AiBadge mode={mode} />
          <Button
            variant="ghost"
            aria-expanded={!hidden}
            aria-controls="ai-hints-body"
            onClick={() => setHidden(!hidden)}
          >
            {hidden ? "Pokaż podpowiedzi" : "Ukryj podpowiedzi"}
          </Button>
        </div>
      </div>
      <div id="ai-hints-body" hidden={hidden} className="space-y-3">
        <p className="text-muted text-sm">
          Podpowiedź AI: uzasadnienie i ocenę wpisujesz Ty. Każdy fragment
          możesz zaakceptować, zmienić albo odrzucić.
        </p>
        {listing.isDemo && <DemoDataNote />}
        {error && <StatusAlert tone="danger">{error}</StatusAlert>}
        {data === undefined ? (
          <p>Ładowanie podpowiedzi…</p>
        ) : (
          <>
            {data.inconsistencies.length > 0 && (
              <StatusAlert tone="warning" live={false}>
                {data.inconsistencies.map((i) => i.message).join(" ")}
              </StatusAlert>
            )}
            <p className="text-muted text-sm">
              Użyte obserwacje: {data.observations.used} z{" "}
              {data.observations.total}.
            </p>
            {fragments.length === 0 && (
              <p>Brak podpowiedzi. Wygeneruj je na podstawie ocen.</p>
            )}
            <ul className="space-y-3">
              {fragments.map(({ draft, label }) => (
                <Fragment
                  key={draft._id}
                  draft={draft}
                  label={label}
                  listing={data}
                  employeeId={view.review.employeeId}
                  pending={pending}
                  onDecide={(status) =>
                    void run(() => setStatus({ draftId: draft._id, status }))
                  }
                  onSaveEdit={(text) =>
                    run(() => editDraft({ draftId: draft._id, text }))
                  }
                />
              ))}
            </ul>
          </>
        )}
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              const result = await generate({ reviewId });
              if (!result.ok) setError(result.message);
            })
          }
        >
          Wygeneruj podpowiedzi
        </Button>
      </div>
    </section>
  );
}
