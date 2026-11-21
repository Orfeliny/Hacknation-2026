import type {
  AdviceDetail,
  AdviceListItem,
} from "../../../../convex/lib/contracts/advice";
import type { ArgsOf } from "../useDemo";
import type { listAdviceContract } from "../../../../convex/lib/contracts/advice";
import { createDemoStore } from "../useDemo";

export const adviceStore = createDemoStore<AdviceDetail[]>(() => [
  {
    slug: "informacja-zwrotna-w-trzech-krokach",
    title: "Informacja zwrotna w trzech krokach",
    summary:
      "Fakt, wpływ, prośba: jak powiedzieć trudną rzecz bez oceniania osoby.",
    topic: "informacja_zwrotna",
    readingMinutes: 4,
    sourceRef: "docs/materialy_md/porady/informacja-zwrotna.md",
    isDemo: true,
    sections: [
      {
        heading: "Zacznij od faktu",
        paragraphs: ["Opisz, co zaobserwowałeś, bez przymiotników."],
        bullets: ["Data i sytuacja", "Co dokładnie zostało zrobione"],
      },
      {
        heading: "Powiedz, jaki to miało skutek",
        paragraphs: [
          "Skutek dla zespołu albo klienta jest argumentem, nie zarzutem.",
        ],
        bullets: [],
      },
    ],
  },
  {
    slug: "przygotowanie-do-rozmowy-oceniajacej",
    title: "Jak przygotować się do rozmowy oceniającej",
    summary: "Lista pytań i notatek, które warto mieć przed spotkaniem.",
    topic: "rozmowa_oceniajaca",
    readingMinutes: 6,
    isDemo: true,
    sections: [
      {
        heading: "Przed rozmową",
        paragraphs: ["Przejrzyj dziennik obserwacji z całego okresu."],
        bullets: [
          "Zaproponuj termin z wyprzedzeniem",
          "Zostaw czas na pytania pracownika",
        ],
      },
    ],
  },
  {
    slug: "docenianie-codziennej-pracy",
    title: "Docenianie codziennej pracy",
    summary:
      "Krótkie, konkretne podziękowania działają lepiej niż jedna duża pochwała.",
    topic: "docenianie",
    readingMinutes: 3,
    sourceRef: "docs/materialy_md/porady/docenianie.md",
    isDemo: true,
    sections: [
      {
        heading: "Konkret zamiast ogólnika",
        paragraphs: ["Nazwij, co było dobre."],
        bullets: [],
      },
    ],
  },
  {
    slug: "obciazenie-i-dobrostan-zespolu",
    title: "Obciążenie i dobrostan zespołu",
    summary: "Jak zauważyć przeciążenie, zanim odbije się na jakości pracy.",
    topic: "dobrostan",
    readingMinutes: 5,
    isDemo: true,
    sections: [
      {
        heading: "Sygnały ostrzegawcze",
        paragraphs: [],
        bullets: ["Spóźnione zadania", "Mniej zgłaszanych pomysłów"],
      },
    ],
  },
  {
    slug: "kryteria-oceny-w-praktyce",
    title: "Kryteria oceny w praktyce",
    summary: "Co oznaczają poszczególne poziomy skali i jak je rozróżniać.",
    topic: "kryteria_oceny",
    isDemo: true,
    sections: [
      {
        heading: "Poziomy skali",
        paragraphs: ["Oceniaj zachowania, nie cechy osoby."],
        bullets: [],
      },
    ],
  },
]);

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .toLowerCase();

export function listAdvice(
  articles: AdviceDetail[],
  args: ArgsOf<typeof listAdviceContract>,
): AdviceListItem[] {
  const needle = args.search ? fold(args.search.trim()) : "";
  return articles
    .filter((a) => !args.topic || a.topic === args.topic)
    .filter((a) => !needle || fold(`${a.title} ${a.summary}`).includes(needle))
    .map((article) => {
      const { sections, ...row } = article;
      void sections;
      return row;
    });
}
