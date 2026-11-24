# 0024 — The website's photo gallery is off until the couple turns it on

Date: 2026-11-23 · Status: accepted (built)

## Why

Until now every approved photo appeared in the published website's
gallery (decision 0019). The owner asked that nobody's photo be public by
default: the couple should choose to show the gallery.

## Decisions

- The website builder's Basics tab has "Show approved photos on my
  website", **off by default**. It is part of the website draft
  (`content.showGallery`), so, like every website change, it reaches guests
  only when published; turning it off and publishing hides the gallery
  again.
- **Enforced by the API, not just the page.** The public album list, an
  album's photo list and every public photo file answer as if there were
  no photos (empty list, 404) unless the published website has the
  gallery on. A guessed or saved photo address stops working as soon as
  the gallery is turned off and published (browsers may keep a copy for
  the five minutes the file is cacheable).
- Everything else about photos is unchanged: only approved photos of
  listed albums are ever shown, hidden ones never; guests still upload with
  QR links into the couple's private review.
- This applies to websites already published: their galleries are hidden
  until their couples turn them on.
- `WebsiteDto.galleryLive` says whether the live site shows the gallery,
  so the Photos page can say so.
