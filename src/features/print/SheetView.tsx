import type { ReactNode } from "react";
import {
  formatDate,
  type CriterionRow,
  type PersonModel,
  type SheetModel,
  type SignatureBlock,
} from "./sheetModel";

const ORDINAL_GENITIVE = [
  "",
  "pierwszego",
  "drugiego",
  "trzeciego",
  "czwartego",
  "piątego",
  "szóstego",
  "siódmego",
  "ósmego",
  "dziewiątego",
];

const RESULT_LABEL = {
  positive: "pozytywna",
  negative: "negatywna",
  none: "brak",
} as const;

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="shrink-0 text-[9pt] font-semibold tracking-wide text-slate-600 uppercase print:text-black">
        {label}
      </span>
      <span className="min-h-[1.4em] min-w-0 flex-1 border-b border-dotted border-slate-500 px-1 break-words">
        {children}
      </span>
    </div>
  );
}

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span aria-label="zaznaczone" className="font-bold">
      X
    </span>
  ) : null;
}

function Section({
  title,
  children,
  pageBreak = false,
}: {
  title: string;
  children: ReactNode;
  pageBreak?: boolean;
}) {
  return (
    <section
      className={`space-y-3 ${pageBreak ? "print:break-before-page" : ""}`}
    >
      <h2 className="border-b-2 border-black pb-1 text-center text-[12pt] font-bold tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[10pt] font-bold tracking-wide uppercase">
      {children}
    </h3>
  );
}

function PersonBlock({
  title,
  person,
  showUnit,
  positionLabel,
}: {
  title: string;
  person: PersonModel;
  showUnit: boolean;
  positionLabel: string;
}) {
  return (
    <div className="break-inside-avoid space-y-1">
      <SubHeading>{title}</SubHeading>
      <Field label="Imię">{person.firstName}</Field>
      <Field label="Nazwisko">{person.lastName}</Field>
      {showUnit && <Field label="Komórka organizacyjna">{person.unit}</Field>}
      <Field label={positionLabel}>{person.position}</Field>
    </div>
  );
}

function SignatureLine({
  role,
  block,
  name,
}: {
  role: string;
  block: SignatureBlock;
  name?: string;
}) {
  return (
    <div className="grid break-inside-avoid grid-cols-[1fr_1fr_1.4fr] items-end gap-4 pt-5">
      <Field label="Miejscowość">{block?.place}</Field>
      <Field label="Data">{block ? formatDate(block.date) : ""}</Field>
      <div className="text-center">
        <div className="border-b border-dotted border-slate-500 px-1">
          {name ?? " "}
        </div>
        <div className="text-[8pt] text-slate-600 print:text-black">{role}</div>
      </div>
    </div>
  );
}

function fullName(person: PersonModel): string {
  return `${person.firstName} ${person.lastName}`;
}

function RatingMatrix({ model }: { model: SheetModel }) {
  const row = (criterion: CriterionRow) => (
    <tr key={criterion.id} className="break-inside-avoid">
      <th scope="row" className="border border-black p-1 text-left font-normal">
        {criterion.name}
      </th>
      {model.scale.map((level) => (
        <td
          key={level.id}
          className="w-[13%] border border-black p-1 text-center"
        >
          <Mark on={criterion.levelId === level.id} />
        </td>
      ))}
    </tr>
  );
  return (
    <table className="w-full border-collapse text-[9pt]">
      <caption className="sr-only">Oceny cząstkowe kryteriów</caption>
      <thead>
        <tr>
          <th
            scope="col"
            className="border border-black p-1 text-left uppercase"
          >
            Kryteria obowiązkowe
          </th>
          {model.scale.map((level) => (
            <th
              key={level.id}
              scope="col"
              className="border border-black p-1 text-center font-normal"
            >
              {level.label}
              <br />
              <span className="font-semibold">{level.points}</span>{" "}
              {level.points === 1
                ? "punkt"
                : level.points < 5
                  ? "punkty"
                  : "punktów"}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {model.mandatory.map(row)}
        <tr>
          <th
            scope="colgroup"
            colSpan={model.scale.length + 1}
            className="border border-black p-1 text-left uppercase"
          >
            Kryteria dodatkowe wybrane przez oceniającego
          </th>
        </tr>
        {model.additional.length > 0 ? (
          model.additional.map(row)
        ) : (
          <tr>
            <td
              colSpan={model.scale.length + 1}
              className="border border-black p-1 italic"
            >
              brak
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function JustificationText({ model }: { model: SheetModel }) {
  const perCriterion = [...model.mandatory, ...model.additional].filter(
    (criterion) => criterion.justification,
  );
  return (
    <div className="min-h-[5rem] border border-black p-2 whitespace-pre-line">
      {model.justification}
      {perCriterion.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {perCriterion.map((criterion) => (
            <li key={criterion.id}>
              <span className="font-semibold">{criterion.name}:</span>{" "}
              {criterion.justification}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Lines({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="font-semibold">{title}</div>
      <ul className="list-disc pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PartOne({ model }: { model: SheetModel }) {
  return (
    <Section title="CZĘŚĆ I">
      <Field label="Nazwa urzędu">{model.officeName}</Field>
      <PersonBlock
        title="Dane ocenianego"
        person={model.employee}
        showUnit={model.showUnit}
        positionLabel="Stanowisko pracy"
      />
      <PersonBlock
        title="Dane oceniającego"
        person={model.evaluator}
        showUnit={model.showUnit}
        positionLabel={model.sheet === "A" ? "Stanowisko" : "Stanowisko pracy"}
      />
      <div className="break-inside-avoid space-y-2">
        <SubHeading>Kryteria oceny i termin sporządzenia oceny</SubHeading>
        <div className="grid grid-cols-2 gap-4 text-[10pt]">
          <div>
            <div className="font-semibold">Kryteria obowiązkowe</div>
            <ul className="list-disc pl-5">
              {model.mandatory.map((criterion) => (
                <li key={criterion.id}>{criterion.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">
              Kryteria dodatkowe wybrane przez oceniającego (nie więcej niż 3)
            </div>
            {model.additional.length > 0 ? (
              <ul className="list-disc pl-5">
                {model.additional.map((criterion) => (
                  <li key={criterion.id}>{criterion.name}</li>
                ))}
              </ul>
            ) : (
              <p className="italic">brak</p>
            )}
          </div>
        </div>
        <Field label="Termin sporządzenia oceny (dd.mm.rrrr)">
          {formatDate(model.dueDate)}
        </Field>
      </div>
      <div className="break-inside-avoid space-y-1 text-[10pt]">
        <SubHeading>Potwierdzamy</SubHeading>
        <p>
          − przeprowadzenie rozmowy, o której mowa w § 5 ust. 1 rozporządzenia
          Prezesa Rady Ministrów z dnia 4 kwietnia 2016 r. w sprawie warunków i
          sposobu przeprowadzania ocen okresowych urzędników służby cywilnej i
          pracowników służby cywilnej (Dz. U. poz. 470), i omówienie w trakcie
          tej rozmowy wszystkich wymaganych zagadnień,
        </p>
        <p>
          − zapoznanie ocenianego z kryteriami oceny oraz terminem sporządzenia
          oceny.
        </p>
        <SignatureLine
          role="podpis oceniającego"
          block={model.signatures.partOne.evaluator}
          name={fullName(model.evaluator)}
        />
        <SignatureLine
          role="podpis ocenianego"
          block={model.signatures.partOne.employee}
          name={fullName(model.employee)}
        />
      </div>
    </Section>
  );
}

function PartTwo({ model }: { model: SheetModel }) {
  const previous = model.previousReview;
  return (
    <Section title="CZĘŚĆ II" pageBreak>
      <div className="grid break-inside-avoid grid-cols-2 gap-4">
        <Field label="Data przeprowadzenia rozmowy oceniającej">
          {formatDate(model.evaluationConversationDate)}
        </Field>
        <div className="flex items-baseline gap-3">
          <Field label="Okres oceny od" className="flex-1">
            {formatDate(model.periodStart)}
          </Field>
          <Field label="do" className="flex-1">
            {formatDate(model.periodEnd)}
          </Field>
        </div>
      </div>
      <SubHeading>Ocena cząstkowa</SubHeading>
      <RatingMatrix model={model} />
      <Field label="Średnia arytmetyczna z ocen cząstkowych">
        {model.average === null ? "" : formatNumber(model.average)}
      </Field>

      <div className="break-inside-avoid space-y-2">
        <SubHeading>Przyznanie oceny</SubHeading>
        <table className="w-full border-collapse text-[9pt]">
          <caption className="sr-only">
            Ogólny poziom spełnienia kryteriów
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-10 border border-black p-1">
                X
              </th>
              <th scope="col" className="border border-black p-1 text-left">
                Liczba punktów stanowiąca średnią arytmetyczną ze wszystkich
                ocen cząstkowych
              </th>
              <th scope="col" className="border border-black p-1 text-left">
                Ogólny poziom spełnienia kryteriów oceny
              </th>
            </tr>
          </thead>
          <tbody>
            {model.levels.map((level) => (
              <tr key={level.id}>
                <td className="border border-black p-1 text-center">
                  <Mark on={level.selected} />
                </td>
                <td className="border border-black p-1">{level.range}</td>
                <td className="border border-black p-1">{level.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-6 pt-1">
          <span className="font-semibold">
            OCENA OKRESOWA W SŁUŻBIE CYWILNEJ:
          </span>
          {(["positive", "negative"] as const).map((result) => (
            <span key={result} className="flex items-center gap-2">
              <span className="inline-flex h-5 w-6 items-center justify-center border border-black">
                <Mark on={model.result === result} />
              </span>
              {result === "positive" ? "POZYTYWNA" : "NEGATYWNA"}
            </span>
          ))}
        </div>
      </div>

      <div className="break-inside-avoid space-y-1">
        <SubHeading>Uzasadnienie przyznanej oceny</SubHeading>
        <JustificationText model={model} />
      </div>

      <div className="break-inside-avoid space-y-1">
        <SubHeading>
          Wnioski dotyczące indywidualnego programu rozwoju zawodowego
        </SubHeading>
        <div className="min-h-[5rem] space-y-1 border border-black p-2 whitespace-pre-line">
          {model.development.summary}
          <Lines title="Mocne strony" items={model.development.strengths} />
          <Lines title="Obszary do rozwoju" items={model.development.areas} />
          <Lines
            title="Działania rozwojowe"
            items={model.development.actions}
          />
        </div>
      </div>

      {model.isOfficial && (
        <div className="break-inside-avoid space-y-1">
          <SubHeading>
            Dane dotyczące poprzedniej oceny okresowej urzędnika służby cywilnej
          </SubHeading>
          <Field label="Ocena">
            {previous ? RESULT_LABEL[previous.result] : ""}
          </Field>
          <Field label="Poziom">{previous?.levelLabel}</Field>
          <Field label="Data sporządzenia">
            {previous ? formatDate(previous.date) : ""}
          </Field>
        </div>
      )}

      <div className="flex break-inside-avoid flex-wrap items-center gap-4">
        <SubHeading>
          Czy do oceny okresowej dołączono wniosek o przyznanie kolejnego
          stopnia służbowego
        </SubHeading>
        {(
          [
            ["yes", "TAK"],
            ["no", "NIE"],
            ["not_applicable", "NIE DOTYCZY"],
          ] as const
        ).map(([value, label]) => (
          <span key={value} className="flex items-center gap-2">
            <span className="inline-flex h-5 w-6 items-center justify-center border border-black">
              <Mark on={model.promotionAttached === value} />
            </span>
            {label}
          </span>
        ))}
      </div>

      <div className="break-inside-avoid space-y-1">
        <PersonBlock
          title="Dane oceniającego"
          person={model.evaluator}
          showUnit={model.showUnit}
          positionLabel="Stanowisko"
        />
        <SignatureLine
          role="podpis oceniającego"
          block={model.signatures.assessment.evaluator}
          name={fullName(model.evaluator)}
        />
      </div>

      <div className="break-inside-avoid space-y-1">
        <p className="font-semibold">
          Przeprowadzono ze mną rozmowę oceniającą oraz zapoznałem (-łam) się z
          oceną okresową i wnioskami dotyczącymi indywidualnego programu rozwoju
          zawodowego
        </p>
        <SignatureLine
          role="podpis ocenianego"
          block={model.signatures.assessment.employee}
          name={fullName(model.employee)}
        />
        {model.signatures.assessment.deemedAcknowledgement && (
          <p className="text-[9pt] italic">
            Zapoznanie ocenianego z oceną zostało stwierdzone w systemie przez
            oceniającego.
          </p>
        )}
      </div>

      <div className="break-inside-avoid space-y-1">
        <SubHeading>Pouczenie</SubHeading>
        <p>
          Na podstawie art. 83 ust. 1 ustawy z dnia 21 listopada 2008 r. o
          służbie cywilnej od oceny okresowej służy, w terminie 7 dni od dnia
          zapoznania się z oceną, sprzeciw do
          {model.objection.fixedAddressee ? (
            ` ${model.objection.fixedAddressee}.`
          ) : (
            <>
              :{" "}
              <span className="inline-block min-w-[14rem] border-b border-dotted border-slate-500 px-1">
                {model.objection.addressee}
              </span>
            </>
          )}
        </p>
      </div>
    </Section>
  );
}

function PartThree({ model }: { model: SheetModel }) {
  const promotion = model.promotion;
  if (!promotion) return null;
  const evaluatorSignature = model.signatures.assessment.evaluator;
  const next = promotion.nextGrade ? ORDINAL_GENITIVE[promotion.nextGrade] : "";
  return (
    <Section title="CZĘŚĆ III" pageBreak>
      <p className="text-[10pt] italic">
        Wniosek jest wypełniany i dołączany do arkusza oceny okresowej
        ocenianego tylko w sytuacji skorzystania przez oceniającego z możliwości
        przewidzianej w art. 89 ust. 1 ustawy z dnia 21 listopada 2008 r. o
        służbie cywilnej.
      </p>
      <div className="break-inside-avoid space-y-1">
        <SubHeading>Dane urzędnika służby cywilnej</SubHeading>
        <Field label="Imię">{model.employee.firstName}</Field>
        <Field label="Nazwisko">{model.employee.lastName}</Field>
        <Field label="Rok mianowania">{promotion.appointmentYear}</Field>
        <Field label="Posiadany stopień służbowy">
          {promotion.currentGrade}
        </Field>
        <Field label="Data przyznania stopnia służbowego">
          {formatDate(promotion.currentGradeSince)}
        </Field>
      </div>
      <div className="break-inside-avoid space-y-2">
        <SubHeading>
          Wniosek o przyznanie urzędnikowi służby cywilnej kolejnego stopnia
          służbowego
        </SubHeading>
        <p>
          W związku z uzyskaniem przez Panią/Pana{" "}
          <strong>{fullName(model.employee)}</strong> pozytywnej oceny
          okresowej, na podstawie art. 89 ust. 1 ustawy z dnia 21 listopada 2008
          r. o służbie cywilnej wnioskuję o przyznanie <strong>{next}</strong>{" "}
          stopnia służbowego.
        </p>
        <SubHeading>Umotywowanie wniosku</SubHeading>
        <div className="min-h-[7rem] border border-black p-2 whitespace-pre-line">
          {promotion.justification}
        </div>
        <SignatureLine
          role="podpis oceniającego"
          block={evaluatorSignature}
          name={fullName(model.evaluator)}
        />
      </div>
    </Section>
  );
}

export function SheetView({ model }: { model: SheetModel }) {
  return (
    <article
      aria-label={`Arkusz ${model.sheet}`}
      className="mx-auto w-full max-w-[210mm] space-y-6 bg-white p-6 text-[10.5pt] leading-snug text-black shadow print:max-w-none print:p-0 print:shadow-none"
    >
      <div className="space-y-1 text-center">
        <p className="text-right text-[9pt]">Arkusz {model.sheet}</p>
        <h1 className="text-[13pt] font-bold tracking-wide uppercase">
          Ocena okresowa urzędnika służby cywilnej lub pracownika służby
          cywilnej
        </h1>
      </div>
      <PartOne model={model} />
      <PartTwo model={model} />
      <PartThree model={model} />
    </article>
  );
}
