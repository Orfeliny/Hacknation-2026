// @vitest-environment node
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { convertToMarkdown } from "./convert";

async function docx(paragraphs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  const body = paragraphs
    .map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`)
    .join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

describe("convertToMarkdown for DOCX", () => {
  it("reads a Word file in Node", async () => {
    const bytes = await docx([
      "§ 1. Zasady ogólne",
      "Ocena okresowa odbywa się raz w roku.",
    ]);
    const markdown = await convertToMarkdown("docx", bytes);
    expect(markdown).toContain("§ 1. Zasady ogólne");
    expect(markdown).toContain("Ocena okresowa odbywa się raz w roku.");
  });

  it("reads bytes that are a view into a larger buffer", async () => {
    const file = await docx(["Regulamin urzędu"]);
    const padded = new Uint8Array(file.length + 16);
    padded.set(file, 8);
    const view = padded.subarray(8, 8 + file.length);
    expect(await convertToMarkdown("docx", view)).toContain("Regulamin urzędu");
  });
});
