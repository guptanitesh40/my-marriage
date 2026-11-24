# Team & collaboration (M12) — design references

Exported from the Stitch project "My Marriage Minimal Landing Page"
(`1779792492951279942`) on 2026-11-22. Stitch reports no revision numbers;
these are the screens as they were that day. The Stitch screens are the
visual source of truth; PRD TEAM-01 to TEAM-05, the schema and API
documents (as amended by decision 0020) remain the functional one.

| File | Stitch screen | What it shows |
| --- | --- | --- |
| `team-collaboration-c1df757fb5dd4333b836815c3630d3e7.html`, `team-collaboration.jpg` | `c1df757fb5dd4333b836815c3630d3e7` "Team & Collaboration — My Marriage" (desktop) | Prototype states: active team, invite manager drawer, manager detail & remove, revoke invitation dialog, only one owner (co-owner slot), archived (read-only) |
| `manager-invitation-acceptance.png` | `5dbda15e057545d0b3c0a0fad4d28e9a` "Manager Invitation Acceptance — My Marriage" | Invitation card: active, expired / revoked, already accepted, processing |

There are no mobile screens: the page stacks on phones and the drawers
become full-width sheets (decision 0020).

## Changed from the designs (decision 0020)

- A third role, **admin** (e.g. a parent), runs the team with the couple;
  managers never see the team page. The drawer offers Admin or Manager.
- Relationship labels ("Bride's Sister", "Lead Coordinator") are one
  optional free-text label per member, set when inviting and editable.
- "Not now / Decline" declines (the invitation ends; they can be invited
  again). The browser `confirm()` of the prototype is not used.
- "8 tasks" counts open tasks; removal says how many become unassigned
  (not a "workspace general pool": they become Unassigned).
- Left out: search, "Quick Action", notifications bell, "248 Days
  Remaining" and the "Planner Role" footer (not part of this module),
  "Need help? Contact the couple".
