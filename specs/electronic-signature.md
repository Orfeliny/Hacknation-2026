# Electronic signature of the review sheet (#38)

Status: IMPLEMENTED (backend), see the PR for #38 · Issue: #38 · Branch: `feat/38-electronic-signature`

## Goal

Let the evaluator and the reviewed employee sign the review sheet with a real electronic signature
(podpis zaufany, osobisty or kwalifikowany) made outside the system: they download the PDF (#18),
sign it on gov.pl or with their own tool, upload the signed file, and the backend checks that the file
carries a PDF signature. Both signing moments of the regulation are covered: part I after the opening
conversation (§ 6 ust. 2) and the assessment (§ 12).

## Scope

- In: `convex/signatures/` (upload URL, signed-file action, PAdES detection, signature list, deemed
  acknowledgement); a shared signing helper `convex/reviews/signing.ts` extracted from #12's `sign`.
- Out: the UI (built separately in `src/features/signatures/`); cryptographic validation of the
  signature (certificate chain, digest, trust lists via EU DSS) is a pre-production step (#25);
  schema changes.

## API

| Function                                           | Who                                           | What                                                                                     |
| -------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `signatures.mutations.generateUploadUrl`           | the review's evaluator or employee            | upload URL, only in the stages `opening` and `signing`                                   |
| `signatures.actions.attachSignedFile`              | the review's evaluator or employee            | checks the file and records `method: "signed_file"`, `fileId`, `signatureDetected: true` |
| `signatures.mutations.recordDeemedAcknowledgement` | the evaluator or `hr`                         | records the employee's § 12 signature with `deemedById` ("fikcja zapoznania z oceną")    |
| `signatures.queries.listForReview`                 | whoever may view the review (`canViewReview`) | both moments, each with the evaluator's and the employee's entry, status and file URL    |

## Decisions

1. **One signing path.** The stage, order and "already signed" rules and the move to
   `objection_window` after the employee's § 12 signature moved from `reviews.mutations.sign` into
   `recordSignature` in `convex/reviews/signing.ts`. The in-app button (#12), the signed file and the
   deemed acknowledgement all use it, so `validateReview` and the wizard see one kind of signature.
2. **`attachSignedFile` is an action.** Only actions can read file bytes. The check runs before
   anything is stored, so a file without a signature never counts as signed, not even for a moment,
   and the caller gets the message "Nie znaleziono podpisu..." straight away. An internal query does
   all checks that do not need bytes first, so a caller who may not sign never reads or deletes a file;
   the internal mutation `recordSignedFile` re-checks everything in one transaction.
3. **Limits.** Content type `application/pdf`, a `%PDF-` header in the first 1024 bytes, at most 10 MB.
   A rejected file (wrong type, too large, no signature) is deleted from storage.
4. **Detection** (`convex/signatures/pades.ts`) is structural: a `/ByteRange [0 b c d]` whose hole is
   exactly a non-zero hex `/Contents`, inside a signature dictionary (`/Type /Sig`, or a `/FT /Sig`
   field in the file) with `/SubFilter` `adbe.pkcs7.detached`, `adbe.pkcs7.sha1` or
   `ETSI.CAdES.detached`. A prepared but empty field and a document timestamp (`ETSI.RFC3161`) do not
   count. A signature dictionary cannot sit in a compressed object stream, so a plain byte scan is
   enough.
5. **Deemed acknowledgement** is recorded by the evaluator or HR, only in the `signing` stage after the
   evaluator's assessment signature, as the employee's `assessment` entry with `signerId` = the
   employee and `deemedById` = the recorder. It opens the objection window like a signature.
6. **Audit.** Every signature writes `auditLog` action `sign` with details `role:scope[:signed_file|:deemed]`.

## Acceptance criteria (from #38)

- [x] A file without a signature gives "Nie znaleziono podpisu".
- [x] Tests with a signed file and an unsigned one, built as bytes in the test, no personal data.
- [x] File type and size limits.
- [x] Both signing moments (§ 6 ust. 2, § 12) are visible (`listForReview.moments`, with the legal source).
- [x] Tests (`convex/signatures/signatures.test.ts`).

## Pre-production

Replace the structural check with full validation (EU DSS, trusted lists, signer identity matching the
evaluator or the employee) and keep the uploaded files under the records retention rules.
