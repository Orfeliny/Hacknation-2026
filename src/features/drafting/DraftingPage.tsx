import { useAction, useMutation, useQuery } from "convex/react";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { DraftFragment, type DraftRow } from "./DraftFragment";
import { MAX_DRAFT_TEXT, SECTION_LABEL, errorText, labelOf } from "./labels";

type View = FunctionReturnType<typeof api.drafting.queries.listForReview>;
type Section = DraftRow["section"];

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
      <div
        role="alert"
        className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm"
      >
        <p>{this.state.message}</p>
        <Link className="text-indigo-700 underline" to="/projekt">
          Wróć do listy ocen
        </Link>
      </div>
    );
  }
}

function ReviewPicker() {
  const actor = { role: useDemoRole() };
  const rows = useQuery(api.reviews.queries.list, { actor });
  if (rows === undefined) return <p>Ładowanie ocen…</p>;
  if (rows.length === 0) return <p>Brak ocen dostępnych dla wybranej roli.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row._id}>
          <Link
            className="text-indigo-700 underline"
            to={`/projekt?ocena=${encodeURIComponent(row._id)}`}
          >
            {row.employeeName}
          </Link>{" "}
          <span className="text-sm text-slate-600">
            arkusz {row.sheet ?? "nie wybrano"}, {row.stageLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

function usable(draft: DraftRow) {
  return draft.status === "accepted" || draft.status === "edited";
}

async function copyToClipboard(text: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(text);
    return "Skopiowano do schowka.";
  } catch {
    return "Nie udało się skopiować. Zaznacz tekst i skopiuj go ręcznie.";
  }
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
  const [note, setNote] = useState<string | null>(null);
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {drafts.some(usable) && (
          <Button
            className="bg-slate-600 hover:bg-slate-700"
            onClick={() => void copyToClipboard(copyText).then(setNote)}
          >
            Kopiuj zaakceptowane
          </Button>
        )}
        {note && (
          <span role="status" className="text-sm text-slate-700">
            {note}
          </span>
        )}
      </div>
      {drafts.length === 0 ? (
        <p className="text-sm text-slate-600">Brak fragmentów.</p>
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
    <Card className="space-y-2">
      <h2 className="text-lg font-semibold">Dodaj własny fragment</h2>
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="manual-section" className="block text-sm font-medium">
            Część
          </label>
          <select
            id="manual-section"
            value={section}
            onChange={(event) => setSection(event.target.value as Section)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {Object.entries(SECTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {section === "criterion_justification" && (
          <div>
            <label
              htmlFor="manual-criterion"
              className="block text-sm font-medium"
            >
              Kryterium
            </label>
            <select
              id="manual-criterion"
              value={criterionId}
              onChange={(event) => setCriterionId(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Wybierz kryterium</option>
              {ratings.map((rating) => (
                <option key={rating.criterionId} value={rating.criterionId}>
                  {rating.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <label htmlFor="manual-text" className="block text-sm font-medium">
        Treść
      </label>
      <textarea
        id="manual-text"
        value={text}
        maxLength={MAX_DRAFT_TEXT}
        rows={3}
        onChange={(event) => setText(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <Button disabled={text.trim() === ""} onClick={() => void submit()}>
        Dodaj fragment
      </Button>
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
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
  if (view === undefined) return <p>Ładowanie projektu…</p>;

  const fragment = (draft: DraftRow, general = false) => (
    <DraftFragment
      key={draft._id}
      draft={draft}
      evidence={view.evidence}
      general={general}
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
    .join("\n");
  const hasRatings = view.ratings.length > 0;

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await generate({ actor, reviewId });
      if (!result.ok) setMessage(result.message);
    } catch (error) {
      setMessage(errorText(error, "Nie udało się utworzyć projektu."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded border border-indigo-200 bg-indigo-50 p-3 text-sm">
        To propozycja do przejrzenia, a nie gotowa ocena. Oceny kryteriów
        wybrałeś Ty, a AI ich nie wybiera ani nie zmienia. Każdy fragment możesz
        zaakceptować, poprawić albo odrzucić. Wnioski do indywidualnego programu
        rozwoju zawodowego są wymagane (art. 81 ust. 5 ustawy), a uzasadnienie
        jest wymagane dla oceny negatywnej (§ 11 ust. 3 rozporządzenia).
      </p>
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">
          Oceny kryteriów: {view.review.employeeName}
        </h2>
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
                  className="border-t border-slate-200"
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
              className="text-indigo-700 underline"
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
          <span className="text-sm text-slate-600">
            Ponowne generowanie zastępuje tylko propozycje. Zaakceptowane,
            edytowane i odrzucone fragmenty zostają.
          </span>
        </div>
        {message && (
          <p role="alert" className="text-sm text-red-700">
            {message}
          </p>
        )}
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

export function DraftingPage() {
  const [params] = useSearchParams();
  const reviewId = params.get("ocena");
  const role = useDemoRole();
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Projekt treści oceny
      </h1>
      {!online ? (
        <p>
          Projekt treści oceny wymaga połączenia z backendem Convex. Uruchom{" "}
          <code>npm run dev</code>, aby go połączyć.
        </p>
      ) : role === "employee" ? (
        <p>
          Projekt treści oceny jest dla oceniającego. Wybierz rolę przełożonego.
        </p>
      ) : reviewId ? (
        <DraftBoundary key={`${reviewId}|${role}`}>
          <ReviewDrafting reviewId={reviewId as Id<"reviews">} />
        </DraftBoundary>
      ) : (
        <>
          <p>Wybierz ocenę, dla której chcesz przygotować projekt.</p>
          <ReviewPicker />
        </>
      )}
    </section>
  );
}
