# Regulations page: rules version and compliance matrix (#41)

Issue: #41 · Branch: `feat/41-regulations-page` · Status: IN PROGRESS

## Goal

Show the jury that every rule of the periodic review is data with a legal source, and that an
amendment means replacing one rules pack. The page is read-only.

## Scope

- In: `src/features/regulations/**` and this spec. A page at `/przepisy` that renders the active rules
  pack (`RULES_2016` from `convex/rules/pack2016.ts`): sheets with mandatory criteria, rating scale and
  overall levels, deadlines, the legal source of each; a compliance matrix; a short "how to implement an
  amendment" section.
- Out: any change under `convex/` (the rules are a pure module, imported the same way `src/features/print`
  does), the router, the layout, the Sejm ELI API (dropped on 21.11), editing rules.

## Decisions

- D1: the page imports the pack and renders from it. No rule text, number or legal source is copied into a
  component. Labels that are not rules (column names, units, the amendment steps) live in the feature.
- D2: the compliance matrix is a list of rows keyed by `RulesPack.sources`: requirement → provision (read
  from the pack) → functions in `convex/rules` → issues. A test fails when a key of `sources` has no row, or
  a row names a function that `convex/rules` does not export, so the matrix cannot drift from the code.
- D3: the page shows how many provisions the matrix covers (`covered of total`) and lists any gap.
- D4: route `/przepisy`, menu label "Przepisy", order 70 (after print, before devtools).
- D5: the issue column holds issue numbers as text. The rule functions come from #10; #15 and #36 are
  listed where an open issue is about the same provision.

## Acceptance criteria

- [ ] The page renders data from `convex/rules`, without copying rule texts into components (test: another
      pack changes the output).
- [ ] The matrix covers every key of `sources` of the pack from #10 (test).
- [ ] Tests pass and `npm run verify` is green.
