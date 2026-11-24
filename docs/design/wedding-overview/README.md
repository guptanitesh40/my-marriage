# Wedding overview (M14) — design references

Exported from the Stitch project "My Marriage Minimal Landing Page"
(`1779792492951279942`) on 2026-11-23. Stitch reports no revision numbers;
this is the screen as it was that day. The Stitch screen is the visual
source of truth; PRD DASH-01 to DASH-03, the schema and API documents (as
amended by decision 0022) remain the functional one. It supersedes the
M4 overview in `../wedding-dashboard/`.

| File | Stitch screen | What it shows |
| --- | --- | --- |
| `wedding-overview-6f22a5b284294e30a245be185e422f30.html`, `wedding-overview.jpg` | `6f22a5b284294e30a245be185e422f30` "Wedding Overview Dashboard — My Marriage" (desktop) | Prototype states: populated, approaching (3 days), new wedding (empty), archived (view-only) |

There are no mobile, loading or error screens. On phones everything is
one column (headline numbers one per row, quick actions wrapping); on
tablets the numbers are two per row and the panels stack; from 1024 px
the panels sit in two columns as in Stitch. While loading, a skeleton of
the same outline; a section that fails says "unavailable" with a retry
link, never zero (decision 0022).

## Changed from the design (decision 0022)

Only what the wedding's own records hold is shown:

- **Expenses**: "Recorded expenses", not "Total budget utilized"; no
  "62% paid" (there is no budget). The paid/outstanding bar stays, with
  both amounts written out.
- **Approaching state**: a "Wedding week" note in the header from 7 days
  before the first ceremony. No flights, shuttles, drivers, hospitality
  desk or broadcast: none of that exists.
- **New wedding**: real first steps (ceremonies, date, guests, team,
  website) linking to existing pages; no setup wizard.
- **Archived**: the same numbers, read-only, without quick actions; owners
  get links to unpublish the website and hide photos. No memory book,
  guestbook, turn-out percentage or budget comparison.
- **Countdown**: to the main wedding day, with the main venue and map link
  from Settings (M13); no "muhurat" field.
- **Tasks**: rows open the Tasks page; no inline checkbox and no "Call
  vendor", "Pay now" or "Broadcast" buttons. No "assigned to planners".
- **About this wedding**: the Settings description, for the team.
- Left out: the prototype bar, "Cloud Vault", search, notifications and the
  top-bar "Quick Action" button; no timeline link (no timeline module).
