import type { ReactNode } from "react";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { PageHeader } from "../../components/ui/PageHeader";
import { formatDate, today } from "../../lib/format";
import { LEGAL } from "./labels";

export function HrHeader({
  summary,
  actions,
}: {
  summary?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <PageHeader
      title="Oceny okresowe w urzędzie"
      description={
        <>
          Stan na {formatDate(today())}. {summary}
          {summary ? " " : null}Podstawa:{" "}
          <ExternalLink href={LEGAL.art81ust1.href}>
            {LEGAL.art81ust1.text} ustawy o służbie cywilnej
          </ExternalLink>
          .
        </>
      }
      actions={actions}
    />
  );
}
