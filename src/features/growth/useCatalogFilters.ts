import { useState } from "react";
import type {
  DevelopmentCost,
  DevelopmentForm,
  DevelopmentLevel,
} from "../../../convex/growth/constants";
import { isCriterionId, type CriterionId } from "./labels";

// Held by the page, not by the catalog, so the filters survive a visit to an entry and back.
export function useCatalogFilters(initialCriterion: string | null) {
  const [criterion, setCriterion] = useState<CriterionId | "">(
    isCriterionId(initialCriterion) ? initialCriterion : "",
  );
  const [form, setForm] = useState<DevelopmentForm | "">("");
  const [level, setLevel] = useState<DevelopmentLevel | "">("");
  const [cost, setCost] = useState<DevelopmentCost | "">("");
  const [search, setSearch] = useState("");
  return {
    criterion,
    setCriterion,
    form,
    setForm,
    level,
    setLevel,
    cost,
    setCost,
    search,
    setSearch,
  };
}

export type CatalogFilters = ReturnType<typeof useCatalogFilters>;
