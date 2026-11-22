export function SkipLink() {
  return (
    <a
      href="#tresc"
      onClick={(event) => {
        event.preventDefault();
        document.getElementById("tresc")?.focus();
      }}
      className="bg-primary sr-only rounded-md px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 print:hidden"
    >
      Przejdź do treści
    </a>
  );
}
