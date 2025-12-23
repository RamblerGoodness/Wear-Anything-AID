# Outfit System

AI Dungeon script that tracks outfits and time with minimal token use.

## Features

- Outfit tracking by category (dynamic categories allowed).
- Command-driven outfit updates (no AI chatter on command turns).
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

Saved outfits:

- `/saveoutfit <name>`
- `/loadoutfit <name>` (Default Outfit is the base)
- `/loadoutfit default`
- `/deleteoutfit <name>`

Notes:

- Categories should be unquoted (e.g., `/takeoff tops`, not `/takeoff "tops"`).
- Use `Empty` to keep a category with no items.

## AutoCards Integration

- Character story cards get a `[CI Outfit]` block.
- Editing that block updates the character's outfit automatically (when enabled).

## How It Fits Together

1) Use outfit commands to manage what the player is wearing.
2) WTG time tracking continues as normal; auto-describe turns do not advance time.

## Examples

- `/wear layer "T-shirt"`
- `/takeoff layer`
- `/remove "green hat"`
- `/saveoutfit "Casual"`
- `/loadoutfit Casual`
- `/loadoutfit "default"`

## Story Cards

The script creates these story cards if missing:

- `CI Settings`: config values and command reference.
- `[User]'s Outfit`: active outfit by category.
- `Default Outfit`: default outfit template for new users.
- `Saved Outfit` cards: one card per saved outfit name (no keys).
- `Current Date and Time`: WTG state and commands.
- `WTG Data`: internal WTG tracking.
- `WTG Cooldowns`: internal WTG cooldowns.
- `World Time Generator Settings`: WTG settings.

## Settings (CI Settings card)

Edit the `CI Settings` entry to control behavior:

- `enabled = true|false`
- `injectToAN = true|false`
- `autoSyncOutfits = true|false`
- `autoSyncOutfitsToCards = true|false`
- `autoSyncOutfitsFromCards = true|false`
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
