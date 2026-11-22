# Wedding website (M10) — design references

Exported from the Stitch project "My Marriage Minimal Landing Page"
(`1779792492951279942`). The Stitch screens are the visual source of truth;
the PRD, schema and API documents remain the functional one (decision 0017).

| File | Stitch screen | What it shows |
| --- | --- | --- |
| `builder-b47f125d74cc4b58a1cc962c808aec31.html`, `builder*.png` | `b47f125d74cc4b58a1cc962c808aec31` "Wedding Website Builder & Management" | Organizer builder prototype: draft and published overview, editor tabs (Basics, Ceremonies, FAQ, Appearance, Additional), theme cards, live preview (desktop 1280 / mobile 390), publish and unpublish dialogs, archived mode |
| `site-traditional.html`, `site-traditional-*.png` | `3dae555a183e42cfa64c882fb1479490` "Public Wedding Site — Traditional (Desktop)" | Public site, Traditional theme |
| `site-modern.html`, `site-modern-*.png` | `bf061c3dea5340fcae8e8768c203f7f9` "Public Wedding Site — Modern Minimal (Desktop)" | Public site, Modern Minimal theme |
| `site-royal.html`, `site-royal-*.png` | `27aacd41e74c418ab2f3e964acc71c30` "Public Wedding Site — Royal Elegant (Desktop)" | Public site, Royal / Elegant theme |
| `site-unavailable.html`, `site-unavailable-mobile.png` | `dd856c2f5dc04bf48297492a45b3aa6a` "Public Wedding Site — Not Available (Mobile)" | Missing, unpublished or unpublished-again address: reveals nothing |

The guest's RSVP page in each design is in
`docs/design/guest-management-rsvp/themes/`.

The three public-site screens were generated for M10 from one shared content
brief, so they differ in presentation only. Their `*-mobile.png` captures are
the same responsive HTML rendered at 390px: the dedicated mobile generations
timed out in Stitch and could not be retrieved.

## Not implemented from the designs

- Builder: public "RSVP for Celebrations" and "Guest Travel Guide" buttons,
  password protection, contact email, parents' welcome note, header motif
  choice and per-ceremony include switches (decision 0017, D6–D7).
- Sites: invented details with no data behind them — a reason for a cancelled
  ceremony, a livestream start time, "Main auspicious ceremony", an account
  icon in the public top bar, and "Private wedding directory".
- The prototype's Royal hero (dark gold on green) fails contrast; the Royal
  site screen replaces it.
