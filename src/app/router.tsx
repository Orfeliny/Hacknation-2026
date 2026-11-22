import type { ReactElement } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { z } from "zod";
import {
  FEATURE_PROFILES,
  featureProfilesSchema,
} from "../lib/challengeProfile";
import { DEMO_ROLE_VALUES } from "../lib/demoRole";
import { NotFoundPage } from "../routes/NotFoundPage";
import { HomeRoute } from "./HomeRoute";
import { Layout } from "./Layout";
import type { NavItem } from "./navigation";
import { RootError, RouteError } from "./RouteError";

const rolesSchema = z.array(z.enum(DEMO_ROLE_VALUES)).min(1).optional();

const featureSchema = z.object({
  path: z.string().regex(/^\/[^*]+$/, "path must start with / and be concrete"),
  navLabel: z.string().min(1),
  order: z.number(),
  element: z.custom<ReactElement>(
    (value) => typeof value === "object" && value !== null,
    "element must be a React element",
  ),
  devOnly: z.boolean().optional(),
  profiles: featureProfilesSchema,
  roles: rolesSchema,
  startFor: rolesSchema,
  hideInNav: z.boolean().optional(),
  navGroup: z.enum(["work", "help"]).optional(),
  navHide: z
    .array(
      z.object({
        profile: z.enum(FEATURE_PROFILES),
        roles: z.array(z.enum(DEMO_ROLE_VALUES)).min(1),
      }),
    )
    .optional(),
  layout: z.literal("bare").optional(),
  // Rendered on every page next to the layout, e.g. a modal that opens by itself.
  overlay: z
    .custom<ReactElement>(
      (value) => typeof value === "object" && value !== null,
      "overlay must be a React element",
    )
    .optional(),
});

export type Feature = z.infer<typeof featureSchema>;
export type FeatureModules = Record<string, { default: unknown }>;

export function collectFeatures(
  modules: FeatureModules,
  includeDevOnly: boolean = import.meta.env.DEV,
): Feature[] {
  return Object.entries(modules)
    .map(([file, mod]) => {
      const parsed = featureSchema.safeParse(mod.default);
      if (!parsed.success) {
        throw new Error(
          `Invalid feature module ${file}: ${parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`,
        );
      }
      return parsed.data;
    })
    .filter((f) => includeDevOnly || !f.devOnly)
    .sort((a, b) => a.order - b.order);
}

export function buildRoutes(
  features: Feature[],
  offline: boolean,
): RouteObject[] {
  const nav: NavItem[] = features.map((f) => ({
    path: f.path,
    label: f.navLabel,
    order: f.order,
    profiles: f.profiles,
    roles: f.roles,
    startFor: f.startFor,
    hideInNav: f.hideInNav,
    navGroup: f.navGroup,
    navHide: f.navHide,
    layout: f.layout,
  }));
  return [
    {
      errorElement: <RootError />,
      element: (
        <Layout
          nav={nav}
          offline={offline}
          overlays={features.flatMap((f) => (f.overlay ? [f.overlay] : []))}
        />
      ),
      children: [
        {
          // Pathless wrapper: errors render in the Layout's outlet, not instead of the Layout.
          errorElement: <RouteError nav={nav} />,
          children: [
            {
              path: "/",
              element: (
                <HomeRoute nav={nav} paths={features.map((f) => f.path)} />
              ),
            },
            ...features.map((f) => ({ path: f.path, element: f.element })),
            { path: "*", element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ];
}

export function createAppRouter(offline: boolean) {
  const modules = import.meta.glob("../features/*/feature.tsx", {
    eager: true,
  }) as FeatureModules;
  return createBrowserRouter(buildRoutes(collectFeatures(modules), offline));
}
