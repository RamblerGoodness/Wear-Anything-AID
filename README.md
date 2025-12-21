# Outfit System

AI Dungeon script that tracks player outfits from input and output text, with optional Author's Note injection.

## Features

- Outfit tracking by category (dynamic categories allowed).
- Command-driven outfit tracking.
- World Time Generator (WTG 2.0).
- Immersive D20 outcomes for `try`/`attempt` actions.
- Hybrid Card generation. Keep important places and things in focus and only create new cards on command.

## Included Scripts

- Immersive D20 (original by SlumberingMage): <https://github.com/SlumberingMage/AID-Oracle/blob/main/distribution/oracle-lite-1.1-input.js>
- Better Say Action <https://discord.com/channels/903327676884979802/1381678302238081158/1381678302238081158>
- World Time Generator 2.0: <https://github.com/thisisasetuptomyrap-cmyk/World-Time-Generator-2.0>

## Install

Copy each file into the matching AI Dungeon script tab:

- `scr/Input.js` -> Input
- `scr/Context.js` -> Context
- `scr/Output.js` -> Output
- `scr/Library.js` -> Library

## Commands

Outfit:

- `/undress` (removes everything leaves categories)
- `/reloadoutfit` (if started with default outfit will reset to that)
- `/outfit`
- `/seen <loc|obj|char> "Name"` (adds to Focus list)
- `/promote <loc|obj|char> "Name"` (creates a full story card)
- `/forget <loc|obj|char> "Name"`
- `/pin <loc|obj|char> "Name"` (keep in Focus)
- `/unpin <loc|obj|char> "Name"`
- `/listfocus`
- `/saveoutfit <name>` (saves current outfit)
- `/loadoutfit <name>` (loads a saved outfit; Default Outfit is the base)
- `/listoutfits`
- `/deleteoutfit <name>`
- `/remove "Item"` (exact match)
- `/remove <category>` (removes the category entirely)
- `/wear <category> "Item"`
- `/wear <category>` (creates an empty category)
- `/takeoff <category> "Item"`
- `/takeoff <category>` (clears everything in that category, keeps the category)

Categories should be unquoted (e.g., `/takeoff tops`, not `/takeoff "tops"`).

Categories are flexible. If you use a new category (e.g., `hands`), it is created automatically.

## Examples

Outfit input:

- /wear layer "T-shirt"
- /wear accessory "green hat"
- /takeoff layer
- /takeoff accessory
- /undress
- /reloadoutfit
- /wear gloves
- /outfit
- /remove "green hat"
- /remove accessory
- /seen loc "Golden Inn"
- /pin loc "Golden Inn"
- /seen char "Innkeeper"
- /seen obj "Silver Key"
- /listfocus
- /promote loc "Golden Inn"
- /saveoutfit "Casual"
- /listoutfits
- /loadoutfit Casual
- /deleteoutfit Casual

## Story Cards

The script creates these story cards if missing:

- `CI Settings`: config values and command reference.
- `[User]'s Outfit`: outfit entries by category.
- `Default Outfit`: default outfit template for new users.
- `Saved Outfit` cards: one card per saved outfit name (no keys so AI only sees the active outfit).
- `CI Focus`: compact list of locations/objects to preserve object permanence without card spam.
- `Current Date and Time`: WTG state and commands.
- `WTG Data`: internal WTG tracking.
- `WTG Cooldowns`: internal WTG cooldowns.
- `World Time Generator Settings`: WTG settings.

## Settings (CI Settings card)

Edit the `CI Settings` entry to control behavior:

- `enabled = true|false`
- `injectToAN = true|false`
- `focusMaxEntries = 10` (max per list in `CI Focus`)
- `autoDescribeOnPromote = true|false`
- `describeTurns = 3` (how many recent turns to use)
- `describeMaxSentences = 3`
- `describeMaxChars = 420`
- `describeMode = overwrite|append`
- `describeOnlyIfEmpty = true|false` (skip auto-describe when a card already has content)

## Notes

- Only explicit commands update outfits (slash commands at the start of input).
- Outfit categories are stored as text labels and shown in title case.
- Use `Empty` as the item list to keep a category with no items.
- Add category aliases in `CI Settings` like `alias boots = feet`.
- `/remove "Item"` removes exact matches across all categories.
- `/remove <category>` deletes the category from the outfit.
- `/loadoutfit <name>` starts from Default Outfit and applies the saved outfit on top; missing categories become Empty so you don't need to save empty categories.
- The AI can suggest tags like `[[loc:Golden Inn]]`, `[[char:Innkeeper]]`, or `[[obj:Silver Key]]`; tags are stripped from output and added to `CI Focus`.
- `/promote` can auto-generate a description from recent context when `autoDescribeOnPromote = true`.
- Author's Note injection is wrapped in a `[CI State]` block to prevent duplicates.
- Immersive D20 triggers on lines with `try/tries/trying/attempt/attempts/attempting` (optionally prefixed with `>`), and keeps results stable on retries.

## How It Fits Together

Flow:

1) Use outfit commands (`/wear`, `/takeoff`, `/remove`) to manage what the player is wearing.
2) Use Focus tags (`[[loc:...]]`, `[[char:...]]`, `[[obj:...]]`) to track places, people, and items without creating cards.
3) When something becomes important, `/promote` it to a full story card.
4) Auto-describe on promote can summarize recent context into the card entry.
5) WTG time tracking continues as normal; auto-describe turns do not advance time.

Do/Don't:

- Do: Tag places/items you want to remember, then promote only the important ones.
- Do: Keep `CI Focus` small; pin only essential entries.
- Don't: Promote everything; it will increase token usage.

## Default Outfit

Set a default outfit in the `Default Outfit` story card using:

```txt
Layer: White Shirt
Bottom: Jeans
Feet: Sneakers
```

Categories are open-ended; any `Category: items` line is accepted.
If the outfit entry is empty, the script uses no default outfit.

### They'er Features not Bugs

This system is not locked to manage clothes even thought that was the intent.
want to keep track of stats? Items? traits? Let the AI see what you look like? You can /wear /takeoff /remove anything! Try it out!

Try:

- /wear race human
- /wear class mage

### Plans/Ideas for future updates

- Multi-category commands like `/takeoff tops, bottoms` and `/remove tops, boots`.
- Batch wear/takeoff across categories, e.g. `/wear tops:"Shirt", bottoms:"Jeans"`.
- Per-user targeting, e.g. `/wear @Alice tops "Jacket"`.
- Undo/redo last outfit change, e.g. `/undooutfit`.
- Optional inventory tie-in so you can only wear items you own.
- Category ordering/priority so outfits render in a consistent, user-defined order.
- Quick toggle to suppress outfit changes from AN output.
