import schema from "../../../convex/schema";

export type FieldInfo = {
  name: string;
  type: string;
  required: boolean;
  refs: string[];
};

export type TableInfo = {
  name: string;
  fields: FieldInfo[];
  indexes: { name: string; fields: string[] }[];
  searchIndexes: { name: string; field: string }[];
};

type AnyValidator = {
  kind: string;
  isOptional: "optional" | "required";
  tableName?: string;
  value?: unknown;
  members?: AnyValidator[];
  element?: AnyValidator;
  fields?: Record<string, AnyValidator>;
};

// Reads the schema the backend enforces, so this page can never drift from it.
type RawTable = {
  validator: AnyValidator;
  indexes: { indexDescriptor: string; fields: string[] }[];
  searchIndexes: { indexDescriptor: string; searchField: string }[];
};

function describe(validator: AnyValidator): string {
  switch (validator.kind) {
    case "id":
      return `id(${validator.tableName ?? "?"})`;
    case "literal":
      return JSON.stringify(validator.value);
    case "union":
      return (validator.members ?? []).map(describe).join(" | ");
    case "array":
      return validator.element ? `${describe(validator.element)}[]` : "array";
    case "object":
      return `{ ${Object.entries(validator.fields ?? {})
        .map(
          ([key, field]) =>
            `${key}${field.isOptional === "optional" ? "?" : ""}: ${describe(field)}`,
        )
        .join("; ")} }`;
    case "float64":
      return "number";
    default:
      return validator.kind;
  }
}

function collectRefs(validator: AnyValidator, into: Set<string>): Set<string> {
  if (validator.kind === "id" && validator.tableName)
    into.add(validator.tableName);
  validator.members?.forEach((member) => collectRefs(member, into));
  if (validator.element) collectRefs(validator.element, into);
  Object.values(validator.fields ?? {}).forEach((field) =>
    collectRefs(field, into),
  );
  return into;
}

export function readTables(): TableInfo[] {
  const tables = schema.tables as unknown as Record<string, RawTable>;
  return Object.entries(tables)
    .map(([name, table]) => ({
      name,
      fields: Object.entries(table.validator.fields ?? {}).map(
        ([fieldName, field]) => ({
          name: fieldName,
          type: describe(field),
          required: field.isOptional === "required",
          refs: [...collectRefs(field, new Set())].filter(
            (ref) => ref !== "_storage",
          ),
        }),
      ),
      indexes: table.indexes.map((index) => ({
        name: index.indexDescriptor,
        fields: index.fields,
      })),
      searchIndexes: table.searchIndexes.map((index) => ({
        name: index.indexDescriptor,
        field: index.searchField,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type Relation = { from: string; field: string; to: string };

export function readRelations(tables: TableInfo[]): Relation[] {
  return tables.flatMap((table) =>
    table.fields.flatMap((field) =>
      field.refs.map((to) => ({ from: table.name, field: field.name, to })),
    ),
  );
}
