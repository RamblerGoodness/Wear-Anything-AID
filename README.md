# Outfit System

AI Dungeon script that tracks player outfits from input and output text, with optional Author's Note injection.

## Features

- Outfit tracking by category (dynamic categories allowed).
- Command-driven outfit tracking.
- Story card persistence for settings and outfit.
- World Time Generator (WTG 2.0) with auto card support.
- Immersive D20 outcomes for `try`/`attempt` actions.

## Included Scripts

- Immersive D20 (original by SlumberingMage): <https://github.com/SlumberingMage/AID-Oracle/blob/main/distribution/oracle-lite-1.1-input.js>
- Better Say Action <https://discord.com/channels/903327676884979802/1381678302238081158/1381678302238081158>
- World Time Generator 2.0 (Auto Cards): <https://github.com/thisisasetuptomyrap-cmyk/World-Time-Generator-2.0>

## Install

Copy each file into the matching AI Dungeon script tab:

- `scr/Input.js` -> Input
- `scr/Context.js` -> Context
- `scr/Output.js` -> Output
- `scr/Library.js` -> Library

## Commands

Outfit:

- `/undress`
- `/reloadoutfit` (if started with default outfit will reset to that)
- `/outfit`
- `/remove "Item"` (exact match)
- `/wear <category> "Item"`
- `/wear <category>` (creates an empty category)
- `/takeoff <category> "Item"`
- `/takeoff <category>` (clears everything in that category)
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

## Story Cards

The script creates these story cards if missing:

- `CI Settings`: config values and command reference.
- `[User]'s Outfit`: outfit entries by category.
- `Default Outfit`: default outfit template for new users.
- `Current Date and Time`: WTG state and commands.
- `WTG Data`: internal WTG tracking.
- `WTG Cooldowns`: internal WTG cooldowns.
- `World Time Generator Settings`: WTG settings.

## Settings (CI Settings card)

Edit the `CI Settings` entry to control behavior:

- `enabled = true|false`
- `injectToAN = true|false`

## Notes

- Only explicit commands update outfits (slash commands at the start of input).
- Outfit categories are stored as text labels and shown in title case.
- Use `Empty` as the item list to keep a category with no items.
- Add category aliases in `CI Settings` like `alias boots = feet`.
- `/remove "Item"` removes exact matches across all categories.
- Author's Note injection is wrapped in a `[CI State]` block to prevent duplicates.
- Immersive D20 triggers on lines with `try/tries/trying/attempt/attempts/attempting` (optionally prefixed with `>`), and keeps results stable on retries.

## Default Outfit

Set a default outfit in the `Default Outfit` story card using:

```txt
Layer: White Shirt
Bottom: Jeans
Feet: Sneakers
```

Categories are open-ended; any `Category: items` line is accepted.
If the outfit entry is empty, the script uses no default outfit.
