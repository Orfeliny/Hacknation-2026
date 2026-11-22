import {
  isVisibleIn,
  type ChallengeProfile,
  type FeatureProfile,
} from "../../lib/challengeProfile";
import type { DemoRole } from "../../lib/demoRole";

export type OnboardingStep = {
  title: string;
  text: string;
  // The step is shown only in these profiles; absent means every profile.
  profiles?: readonly FeatureProfile[];
};

const DEMO_NOTE =
  "W tej wersji wszystkie dane są demonstracyjne, a rolę wybierasz u góry strony.";

export const ONBOARDING_STEPS: Record<DemoRole, OnboardingStep[]> = {
  supervisor: [
    {
      title: "Witaj w Azymucie",
      text: `Azymut wspiera przełożonego w ocenie okresowej: od rozmowy rozpoczynającej, przez obserwację pracy, po arkusz oceny i podpisy. ${DEMO_NOTE}`,
    },
    {
      title: "Oceny",
      text: "W module „Oceny” prowadzisz ocenę pracownika krok po kroku. Kreator pilnuje kolejności etapów i po polsku podpowiada, czego jeszcze brakuje, zanim pozwoli przejść dalej.",
    },
    {
      title: "Pierwsza ocena",
      text: "W profilu Kompas MC jest osobna ścieżka dla pierwszej oceny nowego pracownika służby cywilnej, obok zwykłej oceny okresowej.",
      profiles: ["kompas"],
    },
    {
      title: "HR partner i rozwój",
      text: "„HR partner” pokazuje sygnały dotyczące zespołu i podpowiada działania wspierające. Podpowiedzi nie oceniają pracownika. W module „Rozwój” znajdziesz katalog możliwości rozwoju, a w module „Forum” wymianę doświadczeń z innymi osobami w urzędzie.",
    },
  ],
  employee: [
    {
      title: "Witaj w Azymucie",
      text: `Tu zobaczysz własną ocenę okresową i plan rozwoju. ${DEMO_NOTE}`,
    },
    {
      title: "Moja ocena",
      text: "W module „Moja ocena” czytasz ocenę po jej przekazaniu, potwierdzasz zapoznanie się z nią podpisem i prowadzisz prywatne notatki do rozmowy oceniającej.",
    },
    {
      title: "Sprzeciw",
      text: "Jeśli nie zgadzasz się z oceną, masz 7 dni od zapoznania się z nią na wniesienie sprzeciwu do dyrektora generalnego urzędu. Zrobisz to w module „Sprzeciwy”.",
    },
    {
      title: "Rozwój",
      text: "W module „Rozwój” przeglądasz katalog możliwości rozwoju, a w module „Forum” zadajesz pytania i wymieniasz doświadczenia z innymi osobami w urzędzie.",
    },
  ],
  hr: [
    {
      title: "Witaj w Azymucie",
      text: `Kadry mają wgląd w oceny i dbają o treści, które widzą pracownicy. ${DEMO_NOTE}`,
    },
    {
      title: "Oceny i sprzeciwy",
      text: "W modułach „Oceny” i „Sprzeciwy” śledzisz stan ocen w urzędzie. Masz wgląd tylko do odczytu, podpisy składają przełożony i oceniany.",
    },
    {
      title: "Treść katalogu i porad",
      text: "W module „Rozwój” użyj odnośnika „Zarządzaj treścią”, żeby dodawać i wyłączać wpisy katalogu oraz przygotowywać i publikować porady. Wyłączony wpis zostaje w bazie.",
    },
    {
      title: "Przepisy",
      text: "Moduł „Przepisy” pokazuje wersję reguł oceny, z której korzysta system, razem z podstawą prawną każdej z nich.",
    },
  ],
  director: [
    {
      title: "Witaj w Azymucie",
      text: `Dyrektor generalny rozpatruje sprzeciwy od ocen okresowych. ${DEMO_NOTE}`,
    },
    {
      title: "Sprzeciwy",
      text: "W module „Sprzeciwy” widzisz sprawy, w których wniesiono sprzeciw. Na decyzję masz 14 dni od jego wniesienia. Decyzja po terminie jest możliwa i zostanie oznaczona jako spóźniona.",
    },
    {
      title: "Oceny i przepisy",
      text: "W module „Oceny” możesz czytać oceny, a w module „Przepisy” sprawdzić, na jakich zasadach system je liczy.",
    },
  ],
  admin: [
    {
      title: "Witaj w Azymucie",
      text: `Administrator dba o działanie systemu, nie o treść ocen. ${DEMO_NOTE}`,
    },
    {
      title: "Model AI",
      text: "Moduł „Model AI” pokazuje, który model przetwarza dane i czy zostają one w sieci urzędu. Dostawcę AI wybiera się wyłącznie w konfiguracji backendu, nie na tej stronie.",
    },
    {
      title: "Przepisy i oceny",
      text: "Moduł „Przepisy” pokazuje aktywną wersję reguł. W modułach z ocenami masz dostęp tylko do odczytu.",
    },
  ],
};

export function stepsFor(
  role: DemoRole,
  profile: ChallengeProfile,
): OnboardingStep[] {
  return ONBOARDING_STEPS[role].filter((step) =>
    isVisibleIn(step.profiles, profile),
  );
}
