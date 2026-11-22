export type PluralForms = { one: string; few: string; many: string };

export function plural(n: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules("pl-PL").select(Math.abs(n));
  if (rule === "one") return forms.one;
  if (rule === "few") return forms.few;
  return forms.many;
}
