import { useAction, useMutation, useQuery } from "convex/react";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { PromptPanel } from "../audit/PromptPanel";
import { DraftFragment, type DraftRow } from "./DraftFragment";
import {
  MAX_DRAFT_TEXT,
  SECTION_LABEL,
  copyToClipboard,
  errorText,
  labelOf,
} from "./labels";

type View = FunctionReturnType<typeof api.drafting.queries.listForReview>;
type Section = DraftRow["section"];
type ReviewRow = FunctionReturnType<typeof api.reviews.queries.list>[number];

const H2 = "text-ink text-section font-semibold";

function BackToList() {
  return (
    <Link className="text-primary font-normal underline" to="/projekt">
      Wróć do listy ocen
    </Link>
  );
}

class DraftBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { message: errorText(error, "Nie można wyświetlić tego projektu.") };
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return (
      <StatusAlert tone="warning">
        <p>{this.state.message}</p>
        <BackToList />
      </StatusAlert>
    );
  }
}

function ReviewPicker({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted">Brak ocen dostępnych dla wybranej roli.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row._id}>
          <Card className="flex flex-wrap items-center justify-between gap-2">
            <Link
              className="text-primary font-semibold"
              to={`/projekt?ocena=${encodeURIComponent(row._id)}`}
            >
              {row.employeeName}
            </Link>
            <span className="text-muted text-sm">
              {row.sheet ? `arkusz ${row.sheet}, ` : ""}
              {row.stageLabel}
            </span>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function usable(draft: DraftRow) {
  return draft.status === "accepted" || draft.status === "edited";
}

function SectionBlock({
  title,
  drafts,
  copyText,
  children,
}: {
  title: string;
  drafts: DraftRow[];
  copyText: string;
  children: ReactNode;
}) {
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className={H2}>{title}</h2>
        {drafts.some(usable) && (
          <Button
            variant="secondary"
            onClick={() => void copyToClipboard(copyText).then(setNote)}
          >
            Kopiuj zaakceptowane
          </Button>
        )}
        {note && (
          <span
            role={note.error ? "alert" : "status"}
            className={`text-sm ${note.error ? "text-danger font-semibold" : "text-muted"}`}
          >
            {note.text}
          </span>
        )}
      </div>
      {drafts.length === 0 ? (
        <p className="text-muted text-sm">Brak fragmentów.</p>
      ) : (
        <ul className="space-y-3">{children}</ul>
      )}
    </Card>
  );
}

function ManualForm({
  reviewId,
  ratings,
}: {
  reviewId: Id<"reviews">;
  ratings: View["ratings"];
}) {
  const actor = { role: useDemoRole() };
  const add = useMutation(api.drafting.mutations.addManual);
  const [section, setSection] = useState<Section>("strength");
  const [criterionId, setCriterionId] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    try {
      await add({
        actor,
        reviewId,
        section,
        text,
        criterionId:
          section === "criterion_justification" && criterionId
            ? criterionId
            : undefined,
      });
      setText("");
    } catch (error) {
      setMessage(errorText(error, "Nie udało się dodać fragmentu."));
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className={H2}>Dodaj własny fragment</h2>
      <div className="flex flex-wrap gap-3">
        <Field label="Część">
          <Select
            value={section}
            onChange={(event) => setSection(event.target.value as Section)}
          >
            {Object.entries(SECTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {section === "criterion_justification" && (
          <Field label="Kryterium">
            <Select
              value={criterionId}
              onChange={(event) => setCriterionId(event.target.value)}
            >
              <option value="">Wybierz kryterium</option>
              {ratings.map((rating) => (
                <option key={rating.criterionId} value={rating.criterionId}>
                  {rating.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Field label="Treść">
        <Textarea
          value={text}
          maxLength={MAX_DRAFT_TEXT}
          rows={3}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Button disabled={text.trim() === ""} onClick={() => void submit()}>
        Dodaj fragment
      </Button>
      {message && <StatusAlert tone="danger">{message}</StatusAlert>}
    </Card>
  );
}

function ReviewDrafting({ reviewId }: { reviewId: Id<"reviews"> }) {
  const actor = { role: useDemoRole() };
  const view = useQuery(api.drafting.queries.listForReview, {
    actor,
    reviewId,
  });
  const generate = useAction(api.drafting.actions.generate);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [interactionId, setInteractionId] =
    useState<Id<"aiInteractions"> | null>(null);
  if (view === undefined) return <p>Ładowanie projektu…</p>;

  const flags = new Map(
    view.inconsistencies.map((item) => [item.criterionId, item.message]),
  );
  const fragment = (draft: DraftRow, general = false) => (
    <DraftFragment
      key={draft._id}
      draft={draft}
      evidence={view.evidence}
      general={general}
      flag={
        draft.section === "criterion_justification"
          ? (flags.get(draft.criterionId ?? "") ?? null)
          : undefined
      }
    />
  );
  const of = (section: Section) =>
    view.drafts.filter((d) => d.section === section);
  const text = (drafts: DraftRow[]) =>
    drafts
      .filter(usable)
      .map((d) => d.text)
      .join("\n\n");
  const areas = of("development_area");
  const actions = of("development_action");
  const loose = actions.filter(
    (a) => !areas.some((area) => area._id === a.relatedDraftId),
  );
  const areasCopy = areas
    .filter(usable)
    .map((area) =>
      [
        `- ${area.text}`,
        ...actions
          .filter((a) => a.relatedDraftId === area._id && usable(a))
          .map((a) => `  • ${a.text}`),
      ].join("\n"),
    )
    // An accepted action without an area still belongs in the copy.
    .concat(loose.filter(usable).map((a) => `- ${a.text}`))
    .join("\n");
  const hasRatings = view.ratings.length > 0;

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await generate({ actor, reviewId });
      if (result.ok) setInteractionId(result.interactionId);
      else setMessage(result.message);
    } catch (error) {
      setMessage(errorText(error, "Nie udało się utworzyć projektu."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <Badge className="bg-surface-muted">
          <Icon name="sparkle" className="size-4" />
          Podpowiedź AI
          <span className="sr-only">: uzasadnienie i ocenę wpisujesz Ty</span>
        </Badge>
        <p>
          To propozycja do przejrzenia, a nie gotowa ocena. Oceny kryteriów
          wybrał oceniający, a AI ich nie wybiera ani nie zmienia. Każdy
          fragment możesz zaakceptować, poprawić albo odrzucić.
        </p>
        <p className="text-muted text-sm">
          Wnioski do indywidualnego programu rozwoju zawodowego są wymagane
          (art. 81 ust. 5 ustawy), a uzasadnienie jest wymagane dla oceny
          negatywnej (§ 11 ust. 3 rozporządzenia).
        </p>
      </Card>
      <Card className="space-y-2">
        <h2 className={H2}>Oceny kryteriów</h2>
        <p className="text-muted">Oceniany: {view.review.employeeName}</p>
        {hasRatings ? (
          <table className="w-full text-sm">
            <caption className="sr-only">
              Oceny wybrane przez przełożonego
            </caption>
            <thead>
              <tr className="text-left">
                <th scope="col">Kryterium</th>
                <th scope="col">Poziom</th>
              </tr>
            </thead>
            <tbody>
              {view.ratings.map((rating) => (
                <tr
                  key={rating.criterionId}
                  className="border-divider border-t"
                >
                  <th scope="row" className="py-1 text-left font-normal">
                    {rating.name}
                  </th>
                  <td>{rating.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>
            Najpierw wybierz oceny kryteriów w{" "}
            <Link
              className="text-primary"
              to={`/oceny?ocena=${encodeURIComponent(reviewId)}`}
            >
              kreatorze oceny
            </Link>
            . Bez nich nie powstanie projekt.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy || !hasRatings} onClick={() => void run()}>
            {busy
              ? "Piszę projekt…"
              : view.drafts.length > 0
                ? "Wygeneruj ponownie"
                : "Wygeneruj projekt"}
          </Button>
          <span className="text-muted text-sm">
            Ponowne generowanie zastępuje tylko propozycje. Zaakceptowane,
            edytowane i odrzucone fragmenty zostają.
          </span>
        </div>
        {message && <StatusAlert tone="danger">{message}</StatusAlert>}
        {view.observations.total > view.observations.used && (
          <StatusAlert tone="warning" live={false}>
            Do projektu użyto {view.observations.used} najnowszych z{" "}
            {view.observations.total} obserwacji. Starsze nie zostały wysłane do
            modelu.
          </StatusAlert>
        )}
        {interactionId && <PromptPanel interactionId={interactionId} />}
      </Card>

      <SectionBlock
        title={SECTION_LABEL.criterion_justification ?? ""}
        drafts={of("criterion_justification")}
        copyText={text(of("criterion_justification"))}
      >
        {of("criterion_justification").map((d) => fragment(d))}
      </SectionBlock>
      <SectionBlock
        title={SECTION_LABEL.strength ?? ""}
        drafts={of("strength")}
        copyText={text(of("strength"))}
      >
        {of("strength").map((d) => fragment(d))}
      </SectionBlock>
      <SectionBlock
        title={`${labelOf(SECTION_LABEL, "development_area")} i działania`}
        drafts={[...areas, ...actions]}
        copyText={areasCopy}
      >
        {areas.map((area) => (
          <div key={area._id} className="space-y-2">
            {fragment(area)}
            <ul
              className="ml-6 space-y-2"
              aria-label="Działania dla tego obszaru"
            >
              {actions
                .filter((a) => a.relatedDraftId === area._id)
                .map((a) => fragment(a))}
            </ul>
          </div>
        ))}
        {loose.map((a) => fragment(a))}
      </SectionBlock>
      <SectionBlock
        title={SECTION_LABEL.feedback_tip ?? ""}
        drafts={of("feedback_tip")}
        copyText={text(of("feedback_tip"))}
      >
        {of("feedback_tip").map((d) => fragment(d, true))}
      </SectionBlock>
      <ManualForm reviewId={reviewId} ratings={view.ratings} />
    </div>
  );
}

// The review is opened only once its id is found among the reviews this role may see, so a
// malformed, foreign or deleted id never reaches the drafting query (no console error).
function ReviewGate({ reviewId }: { reviewId: string }) {
  const role = useDemoRole();
  const rows = useQuery(api.reviews.queries.list, { actor: { role } });
  if (rows === undefined) return <p>Ładowanie projektu…</p>;
  const row = rows.find((r) => r._id === reviewId);
  if (!row) {
    return (
      <StatusAlert tone="warning">
        <p>Nie znaleziono tej oceny wśród Twoich ocen.</p>
        <BackToList />
      </StatusAlert>
    );
  }
  return (
    <DraftBoundary key={`${row._id}|${role}`}>
      <ReviewDrafting reviewId={row._id} />
    </DraftBoundary>
  );
}

function Picker() {
  const role = useDemoRole();
  const rows = useQuery(api.reviews.queries.list, { actor: { role } });
  if (rows === undefined) return <p>Ładowanie ocen…</p>;
  return <ReviewPicker rows={rows} />;
}

export function DraftingPage() {
  const [params] = useSearchParams();
  const reviewId = params.get("ocena");
  const role = useDemoRole();
  const online = getEnv().convexUrl !== undefined;
  const picking = role === "supervisor" && !reviewId;
  return (
    <section>
      <PageTitle>Projekt treści oceny</PageTitle>
      <PageHeader
        title="Projekt treści oceny"
        description={
          picking
            ? "Wybierz ocenę, dla której chcesz przygotować projekt."
            : undefined
        }
      />
      <div className="space-y-4">
        {!online ? (
          <p>
            Projekt treści oceny wymaga połączenia z backendem Convex. Uruchom{" "}
            <code>npm run dev</code>, aby go połączyć.
          </p>
        ) : role !== "supervisor" ? (
          <Card>
            Projekt treści oceny jest dla oceniającego. Wybierz rolę
            przełożonego.
          </Card>
        ) : reviewId ? (
          <ReviewGate reviewId={reviewId} />
        ) : (
          <Picker />
        )}
      </div>
    </section>
  );
}
