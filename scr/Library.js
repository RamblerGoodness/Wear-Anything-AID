// Outfit System Library Script

CI_Library();

function CI_Library() {
  initCI();
  createSettingsCard();
  loadSettingsFromSC();
  ensureDefaultUser();
  createIfNoOutfitSC();
  retrieveOutfitsFromSC();
  storeSettingsToSC();
}

// ------------------------------
// Hooks
// ------------------------------
// Input Hook
function CI_Input(text) {
  initCI();
  const ci = state.ci;
  if (!ci.enabled) {
    return text;
  }

  ensureDefaultUser();
  createIfNoOutfitSC();
  retrieveOutfitsFromSC();

  let outfitCommandResult;
  try {
    outfitCommandResult = handleOutfitCommands(text);
  } catch (err) {
    return "<< Outfit command error >>";
  }
  if (outfitCommandResult.handled) {
    storeOutfitToSC();
    storeSettingsToSC();
    return outfitCommandResult.text;
  }

  return text;
}

// Context Hook
function CI_Context(text) {
  initCI();
  const ci = state.ci;
  if (!ci.enabled) {
    return text;
  }
  if (ci.injectToAN) {
    text = injectStateToAN(text);
  }
  return text;
}

// Output Hook
function CI_Output(text) {
  initCI();
  const ci = state.ci;
  if (!ci.enabled) {
    return text;
  }

  ensureDefaultUser();
  createIfNoOutfitSC();
  retrieveOutfitsFromSC();

  storeOutfitToSC();
  storeSettingsToSC();
  return text;
}

// ------------------------------
// Initialization + Settings
// ------------------------------
function initCI() {
  if (!state.ci) {
    state.ci = {};
  }
  const ci = state.ci;
  if (ci.enabled === undefined) {
    ci.enabled = true;
  }
  if (ci.injectToAN === undefined) {
    ci.injectToAN = true;
  }
  if (!ci.users) {
    ci.users = {};
  }
  if (!ci.userList) {
    ci.userList = [];
  }
  if (!ci.aliases) {
    ci.aliases = {};
  }
  if (ci.outfitsLoaded === undefined) {
    ci.outfitsLoaded = false;
  }
}

function createSettingsCard() {
  if (!storyCards.find(sc => sc.title === "CI Settings")) {
    addStoryCard("CI Settings", "Blank", "Outfit System");
    const settingsSC = storyCards.find(sc => sc.title === "CI Settings");
    settingsSC.keys = "Settings for the Outfit System.";
    settingsSC.description = [
      "Settings:",
      "enabled = true|false",
      "injectToAN = true|false",
      "alias boots = feet",
      "",
      "Commands:",
      "/reloadoutfit",
      "/outfit",
      "/remove \"Item\"",
      "/undress",
      "/wear <category> \"Item\"",
      "/takeoff <category> \"Item\""
    ].join("\n");
  }
}

function storeSettingsToSC() {
  const settingsSC = storyCards.find(sc => sc.title === "CI Settings");
  if (!settingsSC) {
    return;
  }
  const ci = state.ci;
  settingsSC.entry = [
    `enabled = ${String(ci.enabled)}`,
    `injectToAN = ${String(ci.injectToAN)}`
  ].join("\n");
}

function loadSettingsFromSC() {
  const settingsSC = storyCards.find(sc => sc.title === "CI Settings");
  if (!settingsSC || !settingsSC.entry) {
    return;
  }
  const ci = state.ci;
  ci.aliases = {};
  const enabledMatch = settingsSC.entry.match(/enabled\s*=\s*(true|false)/i);
  if (enabledMatch) {
    ci.enabled = enabledMatch[1].toLowerCase() === "true";
  }
  const injectMatch = settingsSC.entry.match(/injectToAN\s*=\s*(true|false)/i);
  if (injectMatch) {
    ci.injectToAN = injectMatch[1].toLowerCase() === "true";
  }
  parseAliasSettings(settingsSC.entry);
}

function getUserIdPE() {
  const memory = state.memory || {};
  const plotEssentials = memory.context || "";
  let userId = "Player";

  const regex = /(?:^|\n)\s*(?:Your\s+name\s+is|You\s+are\s+named|Name:|name:)\s*([A-Za-z]+(?:[ \t]+[A-Za-z]+)*)/i;
  const match = plotEssentials.match(regex);
  if (match) {
    userId = match[1] || "Player";
  }
  return userId.trim();
}

function ensureDefaultUser() {
  const ci = state.ci;
  if (ci.userList.length === 0) {
    addUser(getUserIdPE());
  }
}

function isCommandText(text) {
  if (!text) {
    return false;
  }
  return /^\s*(?:-?\s*>\s*)?(?:You\s+|I\s+)?\/(?:wear|takeoff|undress|reloadoutfit|outfit|remove)\b/i.test(text);
}

function addUser(id) {
  const ci = state.ci;
  if (!ci.users[id]) {
    ci.users[id] = {
      outfit: {}
    };
    ci.userList.push(id);
  }
}

function getPrimaryUser() {
  const ci = state.ci;
  if (ci.userList.length === 0) {
    ensureDefaultUser();
  }
  return ci.userList[0];
}

// ------------------------------
// Commands
// ------------------------------
function handleOutfitCommands(text) {
  if (!isCommandText(text)) {
    return { handled: false, text };
  }

  if (text.match(/^\s*(?:-?\s*>\s*)?(?:You\s+|I\s+)?\/reloadoutfit\b/i)) {
    const ci = state.ci;
    ci.outfitsLoaded = false;
    retrieveOutfitsFromSC();
    storeOutfitToSC();
    return { handled: true, text: "<< Outfit state reloaded >>" };
  }

  if (text.match(/^\s*(?:-?\s*>\s*)?(?:You\s+|I\s+)?\/outfit\b/i)) {
    const user = getPrimaryUser();
    return { handled: true, text: buildOutfitSummary(user) };
  }

  const removeMatch = text.match(/^\s*(?:-?\s*>\s*)?(?:You\s+|I\s+)?\/remove\s+(.+)/i);
  if (removeMatch) {
    const itemText = removeMatch[1].trim();
    const item = itemText.replace(/^"(.*)"$/g, "$1").replace(/^'(.*)'$/g, "$1").trim();
    if (!item) {
      return { handled: true, text: "<< Missing outfit item >>" };
    }
    const user = getPrimaryUser();
    const removed = removeOutfitItemAny(user, item);
    if (removed) {
      return { handled: true, text: `<< Removed ${item} >>` };
    }
    return { handled: true, text: `<< ${item} not found >>` };
  }

  if (text.match(/^\s*(?:-?\s*>\s*)?(?:You\s+|I\s+)?\/undress\b/i)) {
    const user = getPrimaryUser();
    clearOutfit(user);
    return { handled: true, text: "You strip out of your clothes.\n<< You are now undressed >>" };
  }

  const match = text.match(/^\s*(?:-?\s*>\s*)?(?:You\s+|I\s+)?\/(wear|takeoff)\s+(.+)/i);
  if (!match) {
    return { handled: false, text };
  }

  const action = match[1].toLowerCase();
  const rawArgs = match[2];
  const parsed = parseOutfitCommandArgs(rawArgs);
  const categoryInput = parsed.category;
  const rawItem = parsed.item;
  const itemWasQuoted = parsed.itemWasQuoted;
  const user = getPrimaryUser();
  const category = normalizeOutfitCategory(categoryInput);

  if (action === "takeoff" && !category && rawArgs && rawArgs.trim().match(/^"[^"]+"$/)) {
    return { handled: true, text: "<< Missing outfit category >>" };
  }

  if (action === "takeoff" && !category && rawItem) {
    const explicitCategory = lookupOutfitCategory(rawItem);
    if (explicitCategory) {
      clearOutfitCategory(user, explicitCategory);
      return { handled: true, text: `<< Cleared ${explicitCategory} >>` };
    }
    const fallbackCategory = normalizeOutfitCategory(rawItem);
    if (fallbackCategory) {
      clearOutfitCategory(user, fallbackCategory);
      return { handled: true, text: `<< Cleared ${fallbackCategory} >>` };
    }
  }

  if (action === "wear" && category && itemWasQuoted && rawItem === "") {
    const outfit = getOutfit(user);
    if (!outfit[category]) {
      outfit[category] = [];
    }
    return { handled: true, text: `<< Added empty category: ${category} >>` };
  }

  if (action === "wear" && !category && rawItem && !itemWasQuoted) {
    const parts = rawArgs.trim().split(/\s+/);
    if (parts.length === 1) {
      const singleCategory = normalizeOutfitCategory(rawItem);
      if (singleCategory) {
        const outfit = getOutfit(user);
        if (!outfit[singleCategory]) {
          outfit[singleCategory] = [];
        }
        return { handled: true, text: `<< Added empty category: ${singleCategory} >>` };
      }
    }
  }

  if (!rawItem && category) {
    if (action === "takeoff") {
      clearOutfitCategory(user, category);
      return { handled: true, text: `<< Cleared ${category} >>` };
    }
    return { handled: true, text: "<< Missing outfit item >>" };
  }

  if (rawItem) {
    const items = parseItemList(rawItem, true);
    if (items.length === 0) {
      return { handled: true, text: "<< Missing outfit item >>" };
    }
    if (category) {
      if (action === "wear") {
        items.forEach(item => addOutfitItemWithCategory(user, category, item.item));
        return { handled: true, text: `<< Added to ${category}: ${items.map(i => i.item).join(", ")} >>` };
      }
      if (action === "takeoff") {
        items.forEach(item => removeOutfitItemWithCategory(user, category, item.item));
        return { handled: true, text: `<< Removed from ${category}: ${items.map(i => i.item).join(", ")} >>` };
      }
    } else {
      if (action === "takeoff") {
        return { handled: true, text: "<< Missing outfit category >>" };
      }
    }
  }

  if (!category) {
    if (action === "wear") {
      return { handled: true, text: "<< Missing outfit category >>" };
    }
    return { handled: true, text: "<< Missing outfit category >>" };
  }

  return { handled: true, text: "<< Unknown outfit command >>" };
}

function parseOutfitCommandArgs(raw) {
  const result = { category: "", item: "", itemWasQuoted: false };
  if (!raw) {
    return result;
  }
  const text = raw.trim();
  if (!text) {
    return result;
  }

  const quoteMatches = [...text.matchAll(/"([^"]*)"/g)];
  if (quoteMatches.length > 0) {
    const lastQuote = quoteMatches[quoteMatches.length - 1];
    const item = lastQuote[1];
    const before = text.slice(0, lastQuote.index).trim();
    result.category = before.replace(/\s+$/, "").trim();
    result.item = item;
    result.itemWasQuoted = true;
    return result;
  }

  const parts = text.split(/\s+/);
  if (parts.length <= 1) {
    result.item = parts.join(" ");
    return result;
  }
  result.item = parts.slice(-1).join(" ");
  result.category = parts.slice(0, -1).join(" ");
  return result;
}

// ------------------------------
// Outfit
// ------------------------------
function normalizeItemName(name) {
  return name.replace(/[.,!?]+$/g, "").replace(/\s+/g, " ").trim();
}
function createIfNoOutfitSC() {
  const ci = state.ci;
  ci.userList.forEach(usr => {
    if (!storyCards.find(sc => sc.title === `${usr}'s Outfit`)) {
      addStoryCard(`${usr}'s Outfit`, "Blank", "Outfit System");
      const outfitSC = storyCards.find(sc => sc.title === `${usr}'s Outfit`);
      outfitSC.keys = `Outfit story card for ${usr}. Edit the entry to change items.`;
      outfitSC.description = [
        "Format:",
        "Category: item1, item2",
        "",
        "Use Empty to show a category with no items.",
        "Omit a category to remove it."
      ].join("\n");
      outfitSC.entry = "Empty";
    }
  });
}

function retrieveOutfitsFromSC() {
  const ci = state.ci;
  if (ci.outfitsLoaded) {
    return;
  }
  ci.userList.forEach(usr => {
    const outfitSC = storyCards.find(sc => sc.title === `${usr}'s Outfit`);
    if (!outfitSC) {
      return;
    }
    if (!ci.users[usr].outfit) {
      ci.users[usr].outfit = {};
    }
    if (outfitSC.entry && outfitSC.entry.trim() && outfitSC.entry.trim().toLowerCase() !== "empty") {
      ci.users[usr].outfit = parseOutfitEntry(outfitSC.entry);
      return;
    }
    const defaultOutfit = getDefaultOutfitFromPE();
    ci.users[usr].outfit = defaultOutfit || {};
    if (defaultOutfit) {
      storeOutfitToSC();
    }
  });
  ci.outfitsLoaded = true;
}

function storeOutfitToSC() {
  const ci = state.ci;
  ci.userList.forEach(usr => {
    const outfitSC = storyCards.find(sc => sc.title === `${usr}'s Outfit`);
    if (!outfitSC) {
      return;
    }
    const outfitCategories = Object.keys(ci.users[usr].outfit || {}).sort();
    if (outfitCategories.length === 0) {
      outfitSC.entry = "Empty";
      return;
    }
    outfitSC.entry = outfitCategories.map(category => {
      const itemsArray = ci.users[usr].outfit[category];
      const label = formatCategoryLabel(category);
    const itemsString = (itemsArray && itemsArray.length > 0)
        ? itemsArray.join(", ")
        : "Empty";
      return `${label}: ${itemsString}`;
    }).join("\n");
  });
}

function parseOutfitEntry(entry) {
  const outfit = {};
  const lines = entry.split("\n");
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const match = trimmed.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (!match) {
      return;
    }
    const category = normalizeOutfitCategory(match[1]);
    const itemsString = match[2].trim();
    if (!itemsString || itemsString.toLowerCase() === "empty" || itemsString.toLowerCase().startsWith("no ")) {
      return;
    }
    const items = itemsString.split(",").map(item => item.trim()).filter(Boolean);
    outfit[category] = items;
  });
  return outfit;
}

function titleCase(text) {
  return text.split(" ").map(w => {
    if (!w) {
      return w;
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

function getDefaultOutfitFromPE() {
  const memory = state.memory || {};
  const plotEssentials = memory.context || "";
  if (!plotEssentials) {
    return null;
  }

  const lines = plotEssentials.split("\n");
  let collecting = false;
  const collected = [];
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!collecting) {
      const match = trimmed.match(/^Outfit\s*:\s*(.*)$/i);
      if (match) {
        collecting = true;
        startIndex = i;
        if (match[1]) {
          collected.push(match[1].trim());
        }
      }
      continue;
    }
    if (!trimmed) {
      endIndex = i;
      break;
    }
    collected.push(trimmed);
  }

  if (collected.length === 0) {
    return null;
  }

  const outfitText = collected.join("\n");
  const outfit = {};
  let foundCategory = false;
  const segments = outfitText.split(/\n|;/)
    .map(segment => segment.trim())
    .filter(Boolean);

  segments.forEach(segment => {
    const match = segment.match(/^([A-Za-z ]+):\s*(.+)$/);
    if (!match) {
      return;
    }
    const rawCategory = match[1].trim();
    const category = normalizeOutfitCategory(rawCategory);
    const items = match[2]
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
    if (category && items.length > 0) {
      outfit[category] = items.map(item => normalizeItemName(item));
      foundCategory = true;
    }
  });

  if (foundCategory) {
    removeOutfitFromPE(memory, lines, startIndex, endIndex);
    return outfit;
  }

  const fallbackItems = outfitText
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean);

  if (fallbackItems.length === 0) {
    return null;
  }

  fallbackItems.forEach(item => {
    const normalized = normalizeItemName(item);
    if (!normalized) {
      return;
    }
    const category = categorizeOutfitItem(normalized);
    if (!outfit[category]) {
      outfit[category] = [];
    }
    if (!outfit[category].includes(normalized)) {
      outfit[category].push(normalized);
    }
  });

  const parsed = Object.keys(outfit).length > 0 ? outfit : null;
  if (parsed) {
    removeOutfitFromPE(memory, lines, startIndex, endIndex);
  }
  return parsed;
}

function removeOutfitFromPE(memory, lines, startIndex, endIndex) {
  if (startIndex < 0) {
    return;
  }
  if (endIndex < 0) {
    return;
  }
  const end = endIndex >= 0 ? endIndex : lines.length - 1;
  const updated = lines.slice(0, startIndex).concat(lines.slice(end + 1));
  memory.context = updated.join("\n");
  state.memory = memory;
}

function injectStateToAN(text) {
  const ci = state.ci;
  const lines = [];
  ci.userList.forEach(usr => {
    const outfitLine = formatOutfitLine(usr);
    if (outfitLine) {
      lines.push(outfitLine);
    }
  });

  if (lines.length === 0) {
    return text;
  }

  const block = buildCiStateBlock(lines);
  const blockRegex = /\[CI State\][\s\S]*?\[\/CI State\]/;
  if (blockRegex.test(text)) {
    return text.replace(blockRegex, block);
  }

  const regex = /(\[Author's note: )([\s\S]*?)(])/;
  if (text.match(regex)) {
    return text.replace(regex, `$1\n\n${block}\n$2$3`);
  }
  return text + "\n\n" + block;
}

function formatOutfitLine(user) {
  const ci = state.ci;
  if (!ci.users[user] || !ci.users[user].outfit) {
    return "";
  }
  const outfit = ci.users[user].outfit;
  const parts = [];
  Object.keys(outfit).forEach(category => {
    const items = outfit[category] || [];
    if (items.length > 0) {
      parts.push(...items);
    }
  });
  const outfitString = parts.length > 0 ? parts.join(", ") : "nothing in particular";
  if (ci.userList.length > 1) {
    return `Assume ${user} is wearing ${outfitString}.`;
  }
  return `Assume player is wearing ${outfitString}.`;
}


function addOutfitItemWithCategory(user, category, item) {
  const outfit = getOutfit(user);
  if (!outfit[category]) {
    outfit[category] = [];
  }
  const normalized = normalizeItemName(item);
  if (!normalized) {
    return;
  }
  const exists = outfit[category].some(i => normalizeItemName(i).toLowerCase() === normalized.toLowerCase());
  if (!exists) {
    outfit[category].push(normalized);
  }
}

function removeOutfitItemWithCategory(user, category, item) {
  const outfit = getOutfit(user);
  if (!outfit[category]) {
    return;
  }
  const normalized = normalizeItemName(item).toLowerCase();
  const index = outfit[category].findIndex(i => normalizeItemName(i).toLowerCase() === normalized);
  if (index !== -1) {
    outfit[category].splice(index, 1);
  }
}

function clearOutfitCategory(user, category) {
  const outfit = getOutfit(user);
  if (!outfit[category]) {
    return;
  }
  delete outfit[category];
}

function clearOutfit(user) {
  const outfit = getOutfit(user);
  Object.keys(outfit).forEach(category => {
    outfit[category] = [];
  });
}

function getOutfit(user) {
  const ci = state.ci;
  if (!ci.users[user]) {
    addUser(user);
  }
  if (!ci.users[user].outfit) {
    ci.users[user].outfit = {};
  }
  return ci.users[user].outfit;
}

function categorizeOutfitItem(item) {
  const lower = item.toLowerCase();
  const categories = [
    { name: "headwear", keywords: ["helmet", "hat", "cap", "hood", "mask", "goggles", "visor"] },
    { name: "footwear", keywords: ["boot", "boots", "shoe", "shoes", "sneaker", "sneakers", "sandal", "sandals"] },
    { name: "bottoms", keywords: ["pants", "jeans", "trousers", "leggings", "skirt", "shorts"] },
    { name: "tops", keywords: ["shirt", "t-shirt", "tee", "blouse", "top", "sweater", "tunic"] },
    { name: "outerwear", keywords: ["coat", "jacket", "armor", "armour", "cloak", "cape", "mantle", "robe"] },
    { name: "undergarments", keywords: ["underwear", "boxers", "briefs", "bra", "panties"] },
    { name: "accessories", keywords: ["ring", "necklace", "bracelet", "belt", "gloves", "gauntlet", "amulet"] }
  ];
  for (const category of categories) {
    if (category.keywords.some(k => lower.includes(k))) {
      return category.name;
    }
  }
  return "accessories";
}

function normalizeOutfitCategory(category) {
  const alias = resolveOutfitAlias(category);
  if (alias) {
    return alias;
  }
  const mapped = lookupOutfitCategory(category);
  if (mapped) {
    return mapped;
  }
  return sanitizeCategory(category);
}

function resolveOutfitAlias(category) {
  if (!category) {
    return null;
  }
  const ci = state.ci || {};
  const aliases = ci.aliases || {};
  const key = normalizeAliasKey(category);
  const target = aliases[key];
  if (!target) {
    return null;
  }
  return sanitizeCategory(target);
}

function normalizeAliasKey(raw) {
  if (!raw) {
    return "";
  }
  return raw.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function parseAliasSettings(entry) {
  const lines = entry.split("\n");
  lines.forEach(line => {
    const match = line.match(/^\s*alias\s+(.+?)\s*=\s*(.+)\s*$/i);
    if (!match) {
      return;
    }
    const aliasKey = normalizeAliasKey(match[1]);
    const category = sanitizeCategory(match[2]);
    if (!aliasKey || !category) {
      return;
    }
    state.ci.aliases[aliasKey] = category;
  });
}

function buildOutfitSummary(user) {
  const outfit = getOutfit(user);
  const categories = Object.keys(outfit).sort();
  if (categories.length === 0) {
    return "<< Outfit is empty >>";
  }
  const lines = categories.map(category => {
    const items = outfit[category] || [];
    const label = formatCategoryLabel(category);
    const itemsString = items.length > 0 ? items.join(", ") : "Empty";
    return `${label}: ${itemsString}`;
  });
  return ["<< Outfit >>", ...lines].join("\n");
}

function removeOutfitItemAny(user, item) {
  const outfit = getOutfit(user);
  const normalized = normalizeItemName(item).toLowerCase();
  if (!normalized) {
    return false;
  }
  let removed = false;
  Object.keys(outfit).forEach(category => {
    const items = outfit[category] || [];
    const nextItems = items.filter(i => {
      const n = normalizeItemName(i).toLowerCase();
      const match = n === normalized;
      if (match) {
        removed = true;
      }
      return !match;
    });
    outfit[category] = nextItems;
  });
  return removed;
}

function lookupOutfitCategory(category) {
  const key = category ? category.toLowerCase() : "";
  const map = {
    outerwear: "outerwear",
    coat: "outerwear",
    jacket: "outerwear",
    tops: "tops",
    top: "tops",
    shirts: "tops",
    shirt: "tops",
    bottoms: "bottoms",
    bottom: "bottoms",
    pants: "bottoms",
    trousers: "bottoms",
    footwear: "footwear",
    shoes: "footwear",
    shoe: "footwear",
    boots: "footwear",
    accessories: "accessories",
    accessory: "accessories",
    headwear: "headwear",
    head: "headwear",
    undergarments: "undergarments",
    underwear: "undergarments"
  };
  return map[key] || null;
}

function buildCiStateBlock(lines) {
  return ["[CI State]", ...lines, "[/CI State]"].join("\n");
}

function sanitizeCategory(category) {
  if (!category) {
    return null;
  }
  const cleaned = category.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function formatCategoryLabel(category) {
  return category.split(" ").map(word => {
    if (!word) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}

function parseItemList(raw, stripClothingWords) {
  if (!raw) {
    return [];
  }
  let cleaned = raw.replace(/[.?!]+$/g, "").trim();
  if (!cleaned) {
    return [];
  }
  const parts = cleaned.split(/\s+(?:and|&)\s+|,\s*/);
  const items = [];
  parts.forEach(part => {
    let itemPart = part.trim();
    if (!itemPart) {
      return;
    }
    itemPart = itemPart.replace(/^"(.*)"$/g, "$1").replace(/^'(.*)'$/g, "$1").trim();
    const qtyMatch = itemPart.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(.+)$/i);
    let qty = 1;
    if (qtyMatch) {
      const parsedQty = parseQuantityToken(qtyMatch[1]);
      if (parsedQty) {
        qty = parsedQty;
      }
      itemPart = qtyMatch[2].trim();
    }
    itemPart = itemPart.replace(/^(a|an|the|my|your)\s+/i, "");
    if (stripClothingWords) {
      itemPart = itemPart.replace(/\b(clothes|clothing|outfit|attire|gear)\b$/i, "").trim();
    }
    if (!itemPart) {
      return;
    }
    items.push({ item: itemPart, qty });
  });
  return items;
}

function parseQuantityToken(token) {
  if (!token) {
    return null;
  }
  const lower = token.toLowerCase();
  if (/^\d+$/.test(lower)) {
    return Math.max(1, parseInt(lower, 10));
  }
  const map = {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10
  };
  return map[lower] || null;
}
