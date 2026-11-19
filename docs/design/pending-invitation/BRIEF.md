# Pending invitation screen: design brief

A brief for designing this screen in Stitch. When the design is approved,
export it into this folder (`DESIGN.md`, `code.html`, `screen.png`), like
the other screens in `docs/design/`.

## Why this screen exists

Someone invited to be a wedding's second owner may sign up or sign in
without the invitation link. For example, they verify their email in a
new tab. Today they then land on "Let's start your wedding", as if nobody
had invited them. If they create a wedding there, they can no longer join
the one they were invited to (each person can own only one wedding).

This screen appears instead. Whenever a signed-in, verified person who
owns no wedding has a pending invitation sent to their email address, they
see it before "Let's start your wedding". They can accept with one click:
their verified email is enough, so they need no link.

## Where it sits

- **Route:** `/onboarding`, shown in place of step 1 when an invitation is
  waiting. It is not a new step in the 3-step progress.
- **Shell:** the same as the onboarding screens. The header has the logo,
  "My Marriage" and "WORKSPACE SETUP" on the left, and the account chip
  (email address) and "Sign out" on the right. The background and the white
  card are the same, as in Stitch's "Onboarding Flow: Steps 1, 2 & 3".
- **Design system:** "Warm Editorial Wedding SaaS" (see
  `docs/design/wedding-setup/DESIGN.md`).
  - Fonts: Newsreader for headings and the couple's name, Manrope for the
    rest.
  - Background: cream `#fdf9f0`; cards are white `#ffffff` with soft
    rounded corners.
  - Primary: deep green `#184539`, used for the main button.
  - Accent: gold `#b89a70` and `#735a35`, used sparingly.
  - Text: `#1c1c16`, and `#404845` for secondary text.

## Screen 1: one invitation waiting (main state)

Top to bottom, centred, the same width as the step 1 form (about 720 px
wide on desktop):

1. **Eyebrow**, small caps with a dot, like "STEP 1 OF 3 · YOUR WEDDING":
   `• YOU'RE INVITED`. No progress bar.
2. **Heading** (Newsreader, large): `Join your wedding`
3. **Intro** (Manrope, body): `Arjun Mehta has already set up your wedding
on My Marriage and invited you to plan it together.`
4. **Invitation card** (white, rounded, the same soft decorative corner as
   the step 1 card):
   - Small label: `WEDDING`
   - The couple's name, large in Newsreader: `Ananya & Arjun`
   - A row of details, each with a small outline icon:
     - location pin: `Jaipur, Rajasthan`
     - calendar: `Saturday, 14 February 2027`. When no date is set, show
       `Date not set yet` instead.
   - A thin divider.
   - "Invited by" with initials in a small circle avatar: `Arjun Mehta`.
   - A tinted note box (light cream `#f7f3ea`, shield or people icon), like
     the step 1 note: `You'll join as an owner, with the same access as
Arjun. You can plan everything together.`
5. **Main button** (full width, deep green, white text, arrow icon on the
   right): `Accept and join`
6. **Secondary action**, a text link centred under the button, not a
   second big button: `Start my own wedding instead`
7. **Footer line** (small, lock icon, secondary text), like step 1's
   footer: `Invitations are private. Only you can accept one sent to
priya@example.com.` Show the signed-in email address here.

## Screen 2: confirm "Start my own wedding instead"

A small dialog over the screen (the background dims), shown when the link
in point 6 is clicked:

- **Title** (Newsreader): `Start a separate wedding?`
- **Body:** `You can own only one wedding. If you start your own, you won't
be able to join Ananya & Arjun's wedding.`
- **Buttons:**
  - primary, deep green: `Go back`
  - secondary, outlined: `Start my own wedding`, which continues to the
    normal step 1 form

## Screen 3: accepting (loading)

The main button shows a small spinner and the text `Joining…`, and is
disabled. Nothing else changes. On success the person goes straight to the
wedding dashboard, so there is no separate success screen.

## Screen 4: problems (one message area, replaces the button row)

Use the existing message style, a soft red-tinted box (`#ffdad6`) with an
icon, for each case:

| Case                                                           | Message                                                            | Action under it                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| The invitation expired, or was replaced or withdrawn meanwhile | `This invitation is no longer valid. Ask Arjun to send a new one.` | Text link: `Start my own wedding instead` |
| The wedding already has two owners                             | `Ananya & Arjun's wedding already has two owners.`                 | Text link: `Start my own wedding instead` |
| Network or server error                                        | `We couldn't join the wedding just now. Please try again.`         | Main button stays: `Try again`            |

## Screen 5: more than one invitation (rare)

Instead of one card, show a short list of compact invitation cards, each
with the couple's name, place, date, "Invited by …" and its own
`Accept and join` button. Heading: `You have 2 invitations`. Same footer
and the same `Start my own wedding instead` link at the bottom.

## Mobile (360 px wide)

- Single column, with 16 px side margins.
- The header keeps the logo and "Sign out"; the account chip may shorten
  the email address with "…".
- The details in the card stack one per line.
- The main button stays full width, with the text link under it.
- The dialog in screen 2 becomes a bottom sheet.

## Accessibility notes for the design

- Text contrast at least 4.5:1. Use `#404845` for small grey text, not the
  lighter outline grey (that failed checks on other screens).
- The text link must look like a link (underlined, or underlined on hover
  with a clear focus outline), not plain grey text.
- Icons are decorative; every action has visible text.
