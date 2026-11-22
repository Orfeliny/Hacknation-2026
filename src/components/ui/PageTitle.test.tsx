import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageTitle } from "./PageTitle";

describe("PageTitle", () => {
  it("sets document.title to '<Screen> — Azymut'", () => {
    render(<PageTitle>Pulpit</PageTitle>);
    expect(document.title).toBe("Pulpit — Azymut");
  });
});
