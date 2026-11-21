import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import { STAGE_LABELS } from "../../../convex/reviews/stages";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { getEnv } from "../../lib/env";
import { useDemoRole } from "../../lib/demoRole";

type Scope = "part_one" | "assessment";

function messageOf(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Nie udało się wykonać operacji. Spróbuj ponownie.";
}

export function MePage() {
  const role = useDemoRole();
  const online = getEnv().convexUrl !== undefined;
  const isEmployee = role === "employee";

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Moja ocena</h1>
      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 lg:hidden">
        Otwórz na komputerze. Ten widok działa od szerokości 1024 px.
      </p>
      <div className="hidden space-y-4 lg:block">
        {!online ? (
          <Card>Tryb offline: moja ocena wymaga połączenia z backendem.</Card>
        ) : !isEmployee ? (
          <Card>
            Ten widok jest dla roli „oceniany”. Wybierz ją w nagłówku.
          </Card>
        ) : (
          <EmployeeView />
        )}
      </div>
    </section>
  );
}

function EmployeeView() {
  const actor = { role: "employee" as const };
  const reviews = useQuery(api.me.queries.myReviews, { actor });
  const notes = useQuery(api.me.queries.myNotes, { actor });

  if (reviews === undefined || notes === undefined) {
    return <Card>Ładowanie…</Card>;
  }
  if (reviews.length === 0) {
    return <Card>Nie masz obecnie żadnej oceny okresowej.</Card>;
  }

  return (
    <>
      {reviews.map((review) => (
        <ReviewCard key={review._id} review={review} />
      ))}
      <NotesCard notes={notes} />
    </>
  );
}

type MyReview = FunctionReturnType<typeof api.me.queries.myReviews>[number];

function ReviewCard({ review }: { review: MyReview }) {
  const actor = { role: "employee" as const };
  const sign = useMutation(api.reviews.mutations.sign);
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const signedBy = (scope: Scope) =>
    review.signatures.some((s) => s.role === "employee" && s.scope === scope);

  const pendingScope: Scope | undefined =
    review.stage === "opening" && !signedBy("part_one")
      ? "part_one"
      : review.stage === "signing" && !signedBy("assessment")
        ? "assessment"
        : undefined;

  async function handleSign(scope: Scope) {
    if (!place.trim()) {
      setError("Podaj miejscowość.");
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await sign({
        actor,
        reviewId: review._id,
        scope,
        place: place.trim(),
      });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Ocena okresowa{review.round > 1 ? ` (runda ${review.round})` : ""}
        </h2>
        <span className="text-sm text-slate-600">
          Etap: {STAGE_LABELS[review.stage]}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-slate-600">Okres</dt>
        <dd>
          {review.periodStart && review.periodEnd
            ? `${review.periodStart} – ${review.periodEnd}`
            : "—"}
        </dd>
        <dt className="text-slate-600">Najbliższy termin</dt>
        <dd>{review.dueDate ?? "—"}</dd>
        <dt className="text-slate-600">Rozmowa rozpoczynająca</dt>
        <dd>{review.openingConversationDate ?? "—"}</dd>
        <dt className="text-slate-600">Oceniający</dt>
        <dd>{review.evaluatorName ?? "—"}</dd>
      </dl>

      {review.expectations.length > 0 && (
        <section>
          <h3 className="font-medium">Ustalenia z rozmowy</h3>
          <ul className="list-disc pl-5 text-sm">
            {review.expectations.map((e) => (
              <li key={e.criterionId}>{e.text}</li>
            ))}
          </ul>
        </section>
      )}

      {review.developmentPlan && (
        <section>
          <h3 className="font-medium">Plan rozwoju (IPRZ)</h3>
          {review.developmentPlan.summary && (
            <p className="text-sm">{review.developmentPlan.summary}</p>
          )}
          {review.developmentPlan.actions.length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {review.developmentPlan.actions.map((a, i) => (
                <li key={i}>{a.text}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {review.assessment && (
        <section>
          <h3 className="font-medium">Ocena</h3>
          <p className="text-sm">
            Wynik:{" "}
            {review.assessment.overallResult === "positive"
              ? "pozytywny"
              : review.assessment.overallResult === "negative"
                ? "negatywny"
                : "—"}
          </p>
          {review.assessment.overallJustification && (
            <p className="text-sm">{review.assessment.overallJustification}</p>
          )}
        </section>
      )}

      {review.objection && (
        <p className="text-sm">
          Sprzeciw wniesiony{" "}
          {new Date(review.objection.filedAt).toLocaleDateString("pl-PL")}.
        </p>
      )}

      {pendingScope && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleSign(pendingScope);
          }}
        >
          <label className="text-sm">
            Miejscowość
            <Input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="block"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pendingScope === "part_one" ? "Podpisz część I" : "Podpisz ocenę"}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </Card>
  );
}

function NotesCard({
  notes,
}: {
  notes: { _id: string; text: string; createdAt: number }[];
}) {
  const actor = { role: "employee" as const };
  const addNote = useMutation(api.me.mutations.addNote);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      await addNote({ actor, text });
      setText("");
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Moje notatki</h2>
      <p className="text-sm text-slate-600">
        Widoczne tylko dla Ciebie. Przełożony ich nie zobaczy.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event: FormEvent) => void handleAdd(event)}
      >
        <label className="flex-1 text-sm">
          Notatka
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="block w-full"
          />
        </label>
        <Button type="submit">Dodaj notatkę</Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="space-y-1 text-sm">
        {notes.map((n) => (
          <li key={n._id}>{n.text}</li>
        ))}
      </ul>
    </Card>
  );
}
