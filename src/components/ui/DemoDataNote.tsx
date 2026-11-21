import { StatusAlert } from "./StatusAlert";

export function DemoDataNote() {
  return (
    <StatusAlert tone="info" live={false}>
      Dane demonstracyjne: widok pokazuje przykładowe wpisy, nie dane urzędu.
    </StatusAlert>
  );
}
