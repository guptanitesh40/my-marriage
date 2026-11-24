# Wedding settings & lifecycle (M13) — design references

Exported from the Stitch project "My Marriage Minimal Landing Page"
(`1779792492951279942`) on 2026-11-23. Stitch reports no revision numbers;
this is the screen as it was that day. The Stitch screen is the visual
source of truth; PRD WED-04 to WED-07, the schema and API documents (as
amended by decisions 0020 and 0021) remain the functional one.

| File | Stitch screen | What it shows |
| --- | --- | --- |
| `wedding-settings-83581788fb02495eb60d4d6fc6f57f4a.html`, `wedding-settings.jpg` | `83581788fb02495eb60d4d6fc6f57f4a` "Wedding Settings & Lifecycle Management — My Marriage" (desktop) | Prototype states: active (owner), manager (restricted), validation errors, archived (read-only), archive dialog, deletion request dialog |

There are no mobile screens: the form becomes one column, the save bar
stays one row at the bottom, dialogs fit the phone, and the workspace
sections open from a Menu button (decision 0021).

## Changed from the design (decision 0021)

- No active-wedding "slot" or limit: anyone may own several weddings
  (decision 0020).
- Only the bride and groom archive or request deletion; admins and
  managers edit details only.
- A deletion request is a soft delete: the wedding goes offline and
  read-only, nothing is erased, and either owner can cancel. The dialog
  says so; the type-to-confirm word is `DELETE`.
- The cover photo is the website's; Settings links to the website builder
  instead of uploading a second cover.
- Main venue and description are private to the team.
- Left out: the prototype bar, workspace ID, sidebar badges, "Cloud Vault",
  "PIN protected", "RAW and video", search and Quick Action, subscription
  and "security team review" wording.
