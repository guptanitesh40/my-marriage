# 0023 — Receipts and documents on expenses and payments

Date: 2026-11-23 · Status: accepted (built)

## Why

PRD EXP-01 asks for an optional receipt image or file on an expense, and
the schema document reserves `receiptAssetIds` and the `receipt` kind of
`file_assets` for it. The owner asked for files whenever an expense is
added or changed and whenever a payment is recorded or removed: "PDF,
image, doc, anything".

## Decisions

- **Where files go.** On an expense (the quote, invoice or contract) and on
  each ledger entry: a payment (receipt, bank slip, UPI screenshot), a
  discount or extra (the revised quote) and a reversal (proof of the
  refund). Up to 10 files per expense and 5 per entry.
- **Which files.** PDF; JPEG, PNG, WebP and HEIC photos; Word (`.doc`,
  `.docx`) and Excel (`.xls`, `.xlsx`). Up to 15 MB each. Not literally
  anything: web pages, SVG images and programs are refused, because a
  file the app hands back must never be able to run in a member's
  browser. Each upload's own first bytes must agree with its type
  (`%PDF-`, the photo signatures, the OLE container for old Office files,
  ZIP for new ones); otherwise it is deleted and refused.
- **How they upload.** As the website cover (decision 0018): the API makes
  a short-lived upload form for `uploads/{weddingId}/{fileId}`, the browser
  posts the file straight to storage, and `…/complete` checks it and moves
  it to `weddings/{weddingId}/receipts/{fileId}.{ext}`. Each chosen file
  uploads at once; the form or dialog sends the IDs of the finished ones
  when it is saved.
- **Attached once, in the same transaction.** Saving an expense or a ledger
  entry attaches its files (`file_assets.attachedTo`) in the transaction
  that writes it, under the archive write fence. A file must be this
  wedding's, checked, and attached to nothing yet; one file can never sit
  on two records. Ledger entries are never changed afterwards, so their
  files are fixed; an expense's files can be added and removed from its
  edit form or its details. A removed file is marked deleted in the
  transaction and its stored copy deleted afterwards.
- **Private.** `GET /weddings/{id}/expense-files/{fileId}` streams a file to
  the wedding's members only (404 to anyone else). Photos open in the
  browser; every other file downloads under its own name. Responses carry
  `nosniff`, a sandboxing Content-Security-Policy and private caching.
  Files never appear on the website or in any public response.
- **Who.** Anyone who can change expenses (owners, admins, managers), while
  the wedding is active; archived weddings keep their files readable.
- **Storage.** Receipts do not count toward the 5 GB photo allowance, like
  covers (decision 0018; an open question in the schema document).
- `file_assets` moved to `platform/storage` because covers and receipts
  share it; it gains `fileName` and `attachedTo`. No new index: files are
  read by ID from the expense or entry that lists them.

## Still open

- Files uploaded but never saved with anything stay in storage, unattached.
  A clean-up job for those (older than a day) can follow.
