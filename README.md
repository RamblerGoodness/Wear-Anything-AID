# Outfit System

AI Dungeon script that tracks outfits, time, and focus items with minimal token use.

## Features

- Outfit tracking by category (dynamic categories allowed).
- Command-driven outfit updates (no AI chatter on command turns).
- Focus tracking for locations, characters, and objects.
- World Time Generator (WTG 2.0).
- Immersive D20 outcomes for `try`/`attempt` actions.

## Install

Copy each file into the matching AI Dungeon script tab:

- `scr/Input.js` -> Input
- `scr/Context.js` -> Context
- `scr/Output.js` -> Output
- `scr/Library.js` -> Library

## Commands

Outfit:

- `/outfit`
- `/wear <category> "Item"`
- `/wear <category>` (creates an empty category)
- `/takeoff <category> "Item"`
- `/takeoff <category>` (clears items, keeps the category)
- `/remove "Item"` (exact match across all categories)
- `/remove <category>` (deletes the category)
- `/undress` (clears all items, keeps categories)
- `/reloadoutfit`

Focus:

- `/mark <loc|obj|char> "Name"`
- `/pin <loc|obj|char> "Name"`
- `/unpin <loc|obj|char> "Name"`
- `/forget <loc|obj|char> "Name"`
- `/promote <loc|obj|char> "Name"` (creates a full story card)

Saved outfits:

- `/saveoutfit <name>`
- `/loadoutfit <name>` (Default Outfit is the base)
- `/loadoutfit default`
- `/deleteoutfit <name>`

Notes:

- Categories should be unquoted (e.g., `/takeoff tops`, not `/takeoff "tops"`).
- Use `Empty` to keep a category with no items.

## Focus Card

`CI Focus` is a compact tracker for locations, characters, and objects. It avoids card spam.

- Add entries with tags like `[[loc:Golden Inn]]`, `[[char:Innkeeper]]`, `[[obj:Silver Key]]` or with `/mark`.
- Repeated entries are de-duplicated and bumped to the top.
- The list is capped per section by `focusMaxEntries`.
- Pin important entries so they never expire.
- Promote important entries to full story cards with `/promote`.

## How It Fits Together

1) Use outfit commands to manage what the player is wearing.
2) Tag places, people, and items to keep them in `CI Focus`.
3) Promote important entries to full story cards.
4) Auto-describe on promote can summarize recent context into the card entry.
5) WTG time tracking continues as normal; auto-describe turns do not advance time.

## Examples

- `/wear layer "T-shirt"`
- `/takeoff layer`
- `/remove "green hat"`
- `/mark loc "Golden Inn"`
- `/mark char "Innkeeper"`
- `/mark obj "Silver Key"`
- `/promote loc "Golden Inn"`
- `/saveoutfit "Casual"`
- `/loadoutfit Casual`
- `/loadoutfit "default"`

## Story Cards

The script creates these story cards if missing:

- `CI Settings`: config values and command reference.
- `[User]'s Outfit`: active outfit by category.
- `Default Outfit`: default outfit template for new users.
- `Saved Outfit` cards: one card per saved outfit name (no keys).
- `CI Focus`: compact focus tracker.
- `Current Date and Time`: WTG state and commands.
- `WTG Data`: internal WTG tracking.
- `WTG Cooldowns`: internal WTG cooldowns.
- `World Time Generator Settings`: WTG settings.

## Settings (CI Settings card)

Edit the `CI Settings` entry to control behavior:

- `enabled = true|false`
- `injectToAN = true|false`
- `focusMaxEntries = 10`
- `autoDescribeOnPromote = true|false`
- `describeTurns = 3`
- `describeMaxSentences = 3`
- `describeMaxChars = 420`
- `describeMode = overwrite|append`
- `describeOnlyIfEmpty = true|false`
- `alias boots = feet`

## Default Outfit

Set a default outfit in the `Default Outfit` story card using:

```txt
Layer: White Shirt
Bottom: Jeans
Feet: Sneakers
```

If the outfit entry is empty, the script uses no default outfit.

## They'er Features not Bugs

This system can track more than clothes. Use `/wear`, `/takeoff`, and `/remove` for stats, traits, or anything else.
