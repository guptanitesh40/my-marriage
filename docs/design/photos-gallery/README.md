# Photos & gallery (M11) — design references

Exported from the Stitch project "My Marriage Minimal Landing Page"
(`1779792492951279942`). The Stitch screens are the visual source of truth;
the PRD (PHOTO-01 to PHOTO-08), schema and API documents remain the
functional one (decision 0019).

| File | Stitch screen | What it shows |
| --- | --- | --- |
| `organizer-photos-9575814fd70846f99f2b57fa77688a69.html`, `organizer-photos.jpg` | `9575814fd70846f99f2b57fa77688a69` "Photos & Albums Workspace" (desktop) | Organizer prototype: albums overview (storage, pending review and public gallery cards; filters; album cards), moderation queue, album detail, empty state, 92% storage warning, share QR & link dialog, create album dialog, privacy footer |
| `guest-upload-mobile.png` | `7f547710d61f40099348b72439934dab` "Guest Photo Upload — Event-Specific (Mobile)" | Guest page from an album's link: album preselected; states Ready, Selected (preview grid), Uploading, Success, Album Picker (general link), Album Closed |
| `guest-upload-progress-mobile.png` | `035de89d72af4567b8ea839aabd7f0b1` "Guest Upload — Progress & Review (Mobile)" | Per-photo progress and errors (uploaded — processing, uploading %, received — pending review, unsupported type with Remove / Replace), retry failed photos, received confirmation |

The public gallery in the three website designs has no screen; it is
drawn with each design's own website skin.

## Not implemented from the designs (decision 0019)

- Organizer: "Upgrade Plan" / "Upgrade to 50 GB" (no paid storage), the
  "VIP / Family Exclusive" album type, the "Require organizer approval"
  switch (every upload waits for review), the free-text "Date & Venue tag"
  (event albums show their ceremony's), tags, the "Archived" album filter,
  "Print Table Cards (PDF)" (a QR image download instead), the readable
  link `/u/m-jaipur27-mehendi` (links are long random tokens), the
  grid/list switch, and the ceremony and sort selects (the kind pills and
  search cover them).
- Guest: HEIC (iPhones turn photos into JPEG when uploading, so JPG, PNG
  and WebP are listed), "Preserving original camera metadata", pause and
  resume, a batch reference number, "Table 4 · Jaipur" and the account icon
  in the top bar.
