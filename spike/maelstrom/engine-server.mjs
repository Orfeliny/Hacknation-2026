// Spike for #31: a Maelstrom Engine in plain Node (no Bun) with a deterministic planner and no model.
// Run: node spike/maelstrom/engine-server.mjs [port]. Loopback only.
import { createServer } from "node:http";
import { createEngine, createInMemoryStore } from "@maelstrom-co/engine";
import {
  ChartRequestMessageSchema,
  InstanceId,
  isErr,
  ok,
  tilingLeafToken,
  VariantName,
  VesselId,
} from "@maelstrom-co/protocol";

const scriptId = InstanceId("script-main");
const chartId = InstanceId("chart-main");

function layout(columns, { talk }) {
  const root = columns < 8 ? "H" : talk ? "V:3,1" : "V:1,1";
  return {
    tree: [root, tilingLeafToken(scriptId), tilingLeafToken(chartId)],
    instances: [
      {
        instanceId: scriptId,
        vesselId: VesselId("script"),
        variant: VariantName(talk ? "full" : "compact"),
      },
      {
        instanceId: chartId,
        vesselId: VesselId("chart"),
        variant: VariantName(talk ? "collapsed" : "bars"),
      },
    ],
  };
}

// Rule-based stand-in for a model: the same Engine, request and response shapes as with an LLM planner.
const planner = async ({ request }) => {
  const intent = request.context.updateReasons.find(
    (r) => r.type === "user_intent",
  );
  const columns = request.context.chartDimensions.columns;
  const current = request.instances.find((i) => i.instanceId === scriptId);
  let talk = current?.variant === "full";
  let message = "Układ dopasowano do okna.";
  if (intent) {
    const text = intent.intent.toLowerCase();
    if (/rozmow\p{L}* ocenia/u.test(text)) {
      talk = true;
      message = "Tryb rozmowy oceniającej: skrypt na pierwszym planie.";
    } else if (/wykres|obserwacj|przegl/.test(text)) {
      talk = false;
      message = "Wykres obserwacji ma więcej miejsca.";
    } else {
      message = "Nie rozpoznano polecenia. Układ bez zmian.";
    }
  }
  return ok({
    userMessage: message,
    rationale: "Deterministic planner used for the spike.",
    executionPlan: [],
    layout: layout(columns, { talk }),
  });
};

const engine = createEngine({
  planner,
  retry: false,
  history: { store: createInMemoryStore(), maxEntries: 16 },
  logger: { debug() {}, info() {}, warn() {}, error() {} },
});

const port = Number(process.argv[2] ?? 3101);
const json = (res, status, body, origin) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin ?? "",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowed =
    origin && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
  if (req.method === "OPTIONS")
    return json(res, 204, {}, allowed ? origin : "");
  if (req.method !== "POST" || req.url !== "/api/process") {
    return json(res, 404, { error: "Not found" }, allowed ? origin : "");
  }
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 65_536)
      return json(res, 413, { error: "Too large" }, allowed ? origin : "");
  }
  const parsed = ChartRequestMessageSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.log(
      "invalid request:",
      JSON.stringify(parsed.error.issues).slice(0, 600),
    );
    return json(res, 400, { error: "Invalid request" }, allowed ? origin : "");
  }
  const started = performance.now();
  const result = await engine.handle(parsed.data, AbortSignal.timeout(25_000));
  if (isErr(result) || result.value.type !== "chart_response") {
    return json(res, 422, { error: "Engine failed" }, allowed ? origin : "");
  }
  console.log(`handled in ${(performance.now() - started).toFixed(1)} ms`);
  json(res, 200, result.value.response, allowed ? origin : "");
}).listen(port, "127.0.0.1", () =>
  console.log(`Maelstrom spike engine on http://127.0.0.1:${port}/api/process`),
);
