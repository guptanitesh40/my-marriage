# 0009 — The wedding workspace

Date: 2026-11-19 · Status: accepted

## Why

`/dashboard` was a welcome card. M4 builds the signed-in workspace around
it, from the Stitch screens "Workspace Handoff & Empty State"
(`docs/design/workspace-handoff/`) and "Wedding Overview"
(`docs/design/wedding-dashboard/`). Both designs show sections and numbers
the product does not have yet, so this records what is built from them and
what waits.

## Decisions

- **The wedding is in the address** (the owner's choice):
  `/weddings/{weddingId}`, with future sections beneath it
  (`/weddings/{weddingId}/events`, …). No page depends on a remembered
  "current wedding". Every request names the wedding, and the API decides
  whether the visitor may see it.
- **`/dashboard` stays the way in.** Every "Go to your dashboard" link
  leads there, and it redirects to the workspace of the visitor's own
  active wedding, or else the newest wedding they belong to. The proxy does
  this before the page renders, and the page makes the same choice if the
  proxy could not ask the API.
- **Not a member, or no such wedding: one answer.** The API answers 404 to
  both (`GET /weddings/{weddingId}`, from the API document), and the page
  shows "We couldn't find that wedding". It never says whether the wedding
  exists. The layout shows this itself, without a Next.js `not-found`
  boundary, because after streaming starts the status code is 200 either
  way.
- **Sections not built yet are shown as "Soon"** (the owner's choice), in
  the design's order. They are plain text, not links, so nobody lands on a
  page that does not exist. Each becomes a link when its feature is built.
- **Only real data.** Design elements with nothing behind them are left
  out until a feature provides it:
  - search and the notifications bell
  - "Quick Action"
  - the count badges in the sidebar
  - concierge and help links
  - recent activity (there is no audit log yet)
  - the website address in the header
  - the "Location Anchor" card, whose description and photo were invented
    (the owner's choice)
  - templates
- **"Copy Link" is not possible.** The design's checklist offers to copy
  the partner's invitation link. Only a hash of the link is stored
  (AGENTS.md), so the link cannot be shown again. The checklist will offer
  Resend and Edit instead, as step 2 of onboarding does.
- **The checklist lists only steps that exist** (the owner's choice).
  "Add your first ceremony", "Create your first planning task" and
  "Personalize your wedding website" appear when their features do.
  Onboarding step 3 (first ceremony, M3.3) waits for the Events feature.
- **On phones, a drawer** (the owner's choice, without a Stitch screen):
  the sidebar opens from a menu button in the top bar (M4.1b). Until then,
  phones show the top bar with the wedding and sign-out.

## Built so far (M4.1a)

- `GET /api/v1/weddings/{weddingId}`: the wedding with the visitor's role,
  in any status, for its members only.
- The workspace layout: the sidebar (brand, wedding and role, sections,
  account and sign-out) and a top bar naming the wedding, with "Archived"
  or "Deletion pending" when it applies.
- The overview's welcome: who is signed in, which wedding, where and when.

Next: M4.1b (collapsing the sidebar, the phone drawer), M4.2 (the
wedding switcher and archived weddings), M4.3 (the dashboard summary from
`GET /weddings/{weddingId}/dashboard`), M4.4 (the checklist and polish).
