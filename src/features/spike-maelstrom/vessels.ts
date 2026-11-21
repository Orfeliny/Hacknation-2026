import {
  defineVessel,
  InstanceId,
  tilingLeafToken,
  VariantName,
  VesselId,
  type TilingLayout,
} from "@maelstrom-co/protocol";

export const scriptVessel = defineVessel({
  id: "script",
  name: "Skrypt rozmowy",
  description: "Pytania i wskazówki do rozmowy oceniającej z pracownikiem.",
  defaultVariant: "compact",
  variants: {
    compact: {
      description: "Trzy główne pytania w skrócie.",
      props: {},
      minSize: { width: 3, height: 2 },
      actions: [],
    },
    full: {
      description: "Cały skrypt rozmowy, krok po kroku.",
      props: {},
      minSize: { width: 4, height: 4 },
      actions: [],
    },
  },
});

export const chartVessel = defineVessel({
  id: "chart",
  name: "Wykres obserwacji",
  description: "Liczba wpisów katalogu rozwoju według formy (dane z Convex).",
  defaultVariant: "bars",
  variants: {
    bars: {
      description: "Słupki według formy.",
      props: {},
      minSize: { width: 3, height: 3 },
      actions: [],
    },
    collapsed: {
      description: "Jedna linia podsumowania.",
      props: {},
      minSize: { width: 2, height: 1 },
      actions: [],
    },
  },
});

export const scriptId = InstanceId("script-main");
export const chartId = InstanceId("chart-main");

export const examples = [
  {
    label: "Zaczynam rozmowę oceniającą",
    intent: "Zaczynam rozmowę oceniającą",
  },
  { label: "Pokaż wykres obserwacji", intent: "Pokaż wykres obserwacji" },
] as const;

export function startLayout(): TilingLayout {
  return {
    type: "tiling",
    tree: ["V:1,1", tilingLeafToken(scriptId), tilingLeafToken(chartId)],
    instances: [
      {
        instanceId: scriptId,
        vesselId: VesselId("script"),
        variant: VariantName("compact"),
      },
      {
        instanceId: chartId,
        vesselId: VesselId("chart"),
        variant: VariantName("bars"),
      },
    ],
  };
}
