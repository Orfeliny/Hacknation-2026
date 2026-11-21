import { z } from "zod";

export const conversationKind = z.enum(["opening", "evaluation", "feedback"]);
export type ConversationKind = z.infer<typeof conversationKind>;

// No transforms: a mockFixture must have exactly the output shape.
export const conversationPlanSchema = z.object({
  goal: z.string().min(1),
  agenda: z.array(z.string().min(1)).min(1),
  questions: z
    .array(
      z.object({ criterionId: z.string().optional(), text: z.string().min(1) }),
    )
    .min(1),
  tips: z.array(z.string().min(1)),
  difficultScenario: z.string().optional(),
  // Opening conversation only: up to 3 additional criteria with a reason (§ 5 ust. 2).
  suggestedCriteria: z
    .array(z.object({ criterionId: z.string(), reason: z.string() }))
    .max(3)
    .optional(),
});

export type ConversationPlan = z.infer<typeof conversationPlanSchema>;

export const MOCK_PLANS: Record<ConversationKind, ConversationPlan> = {
  opening: {
    goal: "Ustalić kryteria oceny, oczekiwania i cele na najbliższe 24 miesiące.",
    agenda: [
      "Główne obowiązki ze stanowiska pracy",
      "Kryteria obowiązkowe i dodatkowe",
      "Oczekiwania wobec każdego kryterium",
      "Cele na okres oceny i sposób ich realizacji",
    ],
    questions: [
      { text: "Które zadania z opisu stanowiska zajmują Ci najwięcej czasu?" },
      {
        criterionId: "organizacja_pracy",
        text: "Jak planujesz pracę, gdy kilka zadań ma ten sam termin?",
      },
      {
        criterionId: "komunikacja",
        text: "W jakiej formie chcesz dostawać ode mnie informację zwrotną?",
      },
    ],
    tips: [
      "Mów o zachowaniach, które da się zaobserwować, a nie o cechach osoby.",
      "Na koniec poproś o streszczenie ustaleń własnymi słowami.",
    ],
    suggestedCriteria: [
      {
        criterionId: "myslenie_analityczne",
        reason:
          "Stanowisko wymaga analizy wyników kontroli i formułowania wniosków.",
      },
    ],
  },
  evaluation: {
    goal: "Omówić realizację obowiązków i celów oraz kierunki rozwoju (§ 10).",
    agenda: [
      "Podsumowanie okresu: najważniejsze zadania",
      "Realizacja kryteriów na przykładach z notatek",
      "Cele i ich wykonanie",
      "Kierunki rozwoju i wnioski do IPRZ",
    ],
    questions: [
      {
        text: "Z którego zadania w tym okresie jesteś najbardziej zadowolony i dlaczego?",
      },
      {
        criterionId: "rzetelnosc",
        text: "Co pomagało, a co przeszkadzało w dotrzymywaniu terminów?",
      },
    ],
    tips: [
      "Zaczynaj od faktów z notatek, potem pytaj o perspektywę pracownika.",
      "Nie podawaj ocen cząstkowych w trakcie rozmowy; ocena powstaje po niej.",
    ],
    difficultScenario:
      "Pracownik nie zgadza się z obserwacją: poproś o przykład, zapisz jego stanowisko i wróć do faktów.",
  },
  feedback: {
    goal: "Krótko docenić to, co działa, i uzgodnić jedną rzecz do poprawy.",
    agenda: [
      "Sytuacja i zachowanie",
      "Wpływ na zespół lub zadanie",
      "Następny krok",
    ],
    questions: [{ text: "Jak widzisz tę sytuację ze swojej strony?" }],
    tips: [
      "Rozmawiaj niedługo po sytuacji, której dotyczy informacja zwrotna.",
    ],
  },
};
