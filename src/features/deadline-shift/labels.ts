import { RULES_2016 } from "../../../convex/rules/pack2016";
import type { ShiftRequest } from "../../../convex/lib/contracts/deadlineShift";

const ISAP =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20082271505";

export const STATUS_LABELS: Record<ShiftRequest["status"], string> = {
  requested: "Czeka na decyzję",
  approved: "Uwzględniony",
  rejected: "Nieuwzględniony",
};

export const BASIS_LABELS: Record<ShiftRequest["basis"], string> = {
  mandatory: "Obowiązkowe",
  optional: "Fakultatywne",
};

export function legalBasis(basis: ShiftRequest["basis"]): {
  text: string;
  anchorLabel: string;
  href: string;
} {
  return basis === "mandatory"
    ? {
        text: RULES_2016.sources.absenceExtension ?? RULES_2016.source,
        anchorLabel: "art. 81 ust. 7 ustawy o służbie cywilnej",
        href: `${ISAP}#art-81-ust-7`,
      }
    : {
        text: RULES_2016.sources.deadlineChange ?? RULES_2016.source,
        anchorLabel: "art. 81 ust. 8 ustawy o służbie cywilnej",
        href: `${ISAP}#art-81-ust-8`,
      };
}

export const BASIS_EXPLANATION: Record<ShiftRequest["basis"], string> = {
  mandatory:
    "Wynika z przepisu, na przykład z nieobecności dłuższej niż miesiąc. Nikt o nim nie decyduje. Kadry wysyłają tylko pismo.",
  optional:
    "Na wniosek pracownika albo z Twojej inicjatywy. Możesz się nie zgodzić. Decyzja wymaga uzasadnienia i pisma.",
};

export type Address = { reviewId: string; changeIndex: number };

export function shiftHref(row: Address): string {
  return `/przesuniecie-terminu?ocena=${encodeURIComponent(row.reviewId)}&zmiana=${row.changeIndex}`;
}
