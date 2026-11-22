# 0018 — Uploaded files: one S3 bucket, a folder per kind, checked uploads

Date: 2026-11-22 · Status: accepted (website cover photo built; gallery photos follow in M11)

## Why

The wedding website looked unfinished without a photo. The owner asked for
an image upload on the website, stored in AWS, with **one bucket for the
whole product** and a folder (key prefix) per kind of file.

## Decisions

- **One bucket**, set by `S3_BUCKET` (`my-marriage` is taken globally, so
  `my-marriage-app` is proposed). Credentials come from the standard AWS
  chain: a profile locally, the task role in AWS. Folders:
  - `uploads/{weddingId}/{fileId}`: new uploads while they are checked; a
    lifecycle rule deletes anything left there after a day.
  - `weddings/{weddingId}/website/cover/{fileId}.{ext}`: kept website covers.
  - Gallery photos, receipts and exports (schema document §9.1) get their
    own folders in the same bucket when they are built.
- **Private bucket.** Public access blocked, encryption on. Nothing is ever
  served straight from S3 and no presigned URL reaches a page: the API
  streams images (`GET /weddings/{id}/website/images/{imageId}` for members;
  `GET /public/weddings/{slug}/cover?v={imageId}` for the published cover,
  cacheable for five minutes because a new photo is a new address).
  CloudFront can replace the public route later (schema document §9).
- **Uploads go straight to S3** with a short-lived presigned POST (ten
  minutes, size range and content type fixed in the policy). The API then
  checks the upload: it arrived, it is at most 10 MB, and its own first
  bytes say it is the JPEG, PNG or WebP it claimed to be. Anything else is
  deleted and refused. A checked upload moves to its kept folder.
- **The browser shrinks photos first** (longest side 2400px, JPEG), so
  guests on phones never download a camera original.
- **The cover is website content.** Uploading makes it the draft's cover
  (a draft edit with the version check and write fence); guests see it once
  it is published, like every other change (0017, D1). It is kept on
  `website_configs.content.coverAssetId` rather than the schema document's
  `weddings.coverAssetId`, so the draft/publish split covers it. Covers
  neither the draft nor the published site uses are deleted.
- **`file_assets`** (schema document §4.22) records each file, scoped to its
  wedding, with one added state, `pending`, while the upload is checked.
  Covers do not count toward the 5 GB gallery quota (an open question in
  the schema document); one cover per site, at most 10 MB.
- **Without a bucket** (development and tests), files are kept in
  `MEDIA_LOCAL_DIR` and the browser posts to the API's `/api/v1/local-uploads`,
  which accepts only forms the API signed. Production requires `S3_BUCKET`.
- **Nothing secret in logs.** The tracer also masks keys containing
  `signature`, `credential` and `policy`, so upload forms never appear.
- The cover shows in all three designs (Traditional: an arched photo;
  Modern: a wide photo under the names; Royal: the hero background under a
  green veil) and in the RSVP page's photo slot, from the published site.

## Still open

- Creating the bucket and its settings is the owner's step (below).
- The app should use a least-privilege IAM role or user, not root keys.
