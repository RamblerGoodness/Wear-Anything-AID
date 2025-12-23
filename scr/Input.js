// Input Script

// Every script needs a modifier function
const modifier = (text) => {
  try {
    text = WTG_Input(text);
    text = oracleInput(text).text;
    text = CI_Input(text);
    if (!(state.ci && state.ci.pendingDescribe)) {
      if (typeof applyAutoCardsInput === "function") {
        text = applyAutoCardsInput(text);
      }
      text = betterSay(text).text;
    }
    return { text };
  } catch (err) {
    return { text };
  }
};

function WTG_Input(text) {
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };


  // Check if WTG is disabled entirely
  if (getWTGBooleanSetting("Disable WTG Entirely")) {
    return text;
  }

  // Initialize state if not present
  if (state.startingDate === undefined) {
    state.startingDate = "01/01/1900";
    state.startingTime = "Unknown";
    state.currentDate = "01/01/1900";
    state.currentTime = "Unknown";
    state.turnTime = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    state.settimeInitialized = false;
    if (!isLightweightMode()) {
      state.timeMultiplier = 1.0;
    }
  }

  state.changed = state.changed || false;
  state.insertMarker = false;

  // Initialize cooldown tracking for AI commands
  state.lastSleepTime = state.lastSleepTime || null;
  state.lastAdvanceTime = state.lastAdvanceTime || null;
  state.sleepWakeTime = state.sleepWakeTime || null;
  state.advanceEndTime = state.advanceEndTime || null;

  let modifiedText = text;
  let messages = [];

  // Check if user action is [sleep] command to trigger sleep
  if (text.trim().toLowerCase() === "[sleep]") {
    if (state.currentTime !== "Unknown" && /\d/.test(state.currentTime)) {
      let sleepHours = Math.floor(Math.random() * 3) + 6;
      let sleepMinutes = Math.floor(Math.random() * 60);
      let add = { hours: sleepHours, minutes: sleepMinutes };
      state.turnTime = addToTurnTime(state.turnTime, add);
      const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
      let wakeMessage = (add.days > 0 || state.turnTime.days > 0) ? "the next day" : "later that day";
      const ttMarker = formatTurnTime(state.turnTime);
      messages.push(`[SYSTEM] You go to sleep and wake up ${wakeMessage} on ${state.currentDate} at ${state.currentTime}. [[${ttMarker}]]`);
    } else {
      // When time is Unknown, set it to 8:00 AM and reset turn time
      state.turnTime = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
      state.turnTime = addToTurnTime(state.turnTime, { days: 1 });
      state.startingTime = "8:00 AM";
      const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
      const ttMarker = formatTurnTime(state.turnTime);
      messages.push(`[SYSTEM] You go to sleep and wake up the next morning on ${state.currentDate} at ${state.currentTime}. [[${ttMarker}]]`);
    }
    state.insertMarker = true;
    state.changed = true;
    // Set sleep cooldown to prevent AI from sleeping again for 8 hours
    setSleepCooldown({ hours: 8 });
    modifiedText = "";
  } else {
    // Handle bracketed commands
    let trimmedText = text.trim();
    if (trimmedText.match(/^\[(.+?)\]$/)) {
      const commandStr = trimmedText.match(/^\[(.+?)\]$/)[1].trim().toLowerCase();
      const parts = commandStr.split(/\s+/);
      const command = parts[0];
      if (command === "settime") {
        let dateStr = parts[1];
        let timeStr = parts.slice(2).join(" ");
        if (dateStr) {
          dateStr = dateStr.replace(/[.-]/g, "/");
          let [part1, part2, year] = dateStr.split("/").map(Number);
          if (year < 100) year += 2000;
          let month = part1;
          let day = part2;
          if (month > 12 && day <= 12) [month, day] = [day, part1];
          if (isValidDate(month, day, year)) {
            state.startingDate = `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
            if (timeStr) {
              state.startingTime = normalizeTime(timeStr);
            }
            state.turnTime = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
            const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
            state.currentDate = currentDate;
            state.currentTime = currentTime;

            // Update timestamps in all existing storycards to reflect the new time
            updateAllStoryCardTimestamps(state.currentDate, state.currentTime);

            const ttMarker = formatTurnTime(state.turnTime);
            messages.push(`[SYSTEM] Starting date and time set to ${state.startingDate} ${state.startingTime}. [[${ttMarker}]]`);
            // Mark settime as initialized
            markSettimeAsInitialized();
            state.insertMarker = true;
            state.changed = true;
            // Clear any existing AI command cooldowns when user resets time (Normal mode only)
            if (!isLightweightMode()) {
              clearCommandCooldowns("user settime command");
            }
          } else {
            messages.push(`[Invalid date: ${dateStr}. Use mm/dd/yyyy or dd/mm/yyyy.]`);
          }
        }
      } else if (command === "advance") {
        if (state.startingTime === "Unknown") {
          messages.push(`[Time advancement not applied as current time is descriptive (${state.startingTime}). Use [settime] to set a numeric time if needed.]`);
        } else {
          const amount = parseInt(parts[1], 10);
          const unit = parts[2] ? parts[2].toLowerCase() : "hours";
          let extraMinutes = 0;
          if (parts[3] === "minutes") {
            extraMinutes = parseInt(parts[4], 10) || 0;
          }
          let add = { minutes: extraMinutes };
          if (unit.startsWith("y")) {
            add.years = amount;
          } else if (unit.startsWith("m")) {
            add.months = amount;
          } else if (unit.startsWith("d")) {
            add.days = amount;
          } else {
            add.hours = amount;
          }
          state.turnTime = addToTurnTime(state.turnTime, add);
          const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
          state.currentDate = currentDate;
          state.currentTime = currentTime;
          const ttMarker = formatTurnTime(state.turnTime);
          messages.push(`[SYSTEM] Advanced ${amount} ${unit}${extraMinutes ? ` and ${extraMinutes} minutes` : ""}. New date/time: ${state.currentDate} ${state.currentTime}. [[${ttMarker}]]`);
          state.insertMarker = true;
          state.changed = true;
          // Set advance cooldown to prevent AI from advancing again for 5 minutes
          setAdvanceCooldown({ minutes: 5 });
        }
      } else if (command === "reset") {
        let newDate = getCurrentDateFromHistory("", true);
        let newTime = getCurrentTimeFromHistory("", true);
        let valid = false;
        if (newDate) {
          let [part1, part2, year] = newDate.split("/").map(Number);
          if (year < 100) year += 2000;
          let month = part1;
          let day = part2;
          if (month > 12 && day <= 12) [month, day] = [day, part1];
          if (isValidDate(month, day, year)) {
            let tempCurrentDate = `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
            let tempCurrentTime = newTime ? normalizeTime(newTime) : state.startingTime;
            state.turnTime = getDateDiff(state.startingDate, state.startingTime, tempCurrentDate, tempCurrentTime);
            state.currentDate = tempCurrentDate;
            state.currentTime = tempCurrentTime;

            // Update timestamps in all existing storycards to reflect the reset time
            updateAllStoryCardTimestamps(state.currentDate, state.currentTime);

            valid = true;
          }
        }
        if (valid) {
          const ttMarker = formatTurnTime(state.turnTime);
          messages.push(`[SYSTEM] Date and time reset to most recent mention: ${state.currentDate} ${state.currentTime}. [[${ttMarker}]]`);
          state.insertMarker = true;
          state.changed = true;
          // Clear any existing AI command cooldowns when user resets time
          clearCommandCooldowns("user reset command");
        } else {
          messages.push("[No date or time mentions found in history.]");
        }
      } else {
        messages.push("[Invalid command. Available: settime, advance, reset, sleep.]");
      }
      modifiedText = "";
    }
  }

  // Add messages to modified text
  if (messages.length > 0) {
    modifiedText = messages.join("\n") + (modifiedText ? "\n" + modifiedText : "");
  }

  if (typeof stripFocusTags === "function") {
    modifiedText = stripFocusTags(modifiedText);
  }

  // Detect triggers in player input and track mentions (only after proper time is set)
  if (text.trim() && !text.trim().match(/^\[(.+?)\]$/) && state.currentDate !== "01/01/1900" && state.currentTime !== "Unknown") {
    // Skip command processing, scan the actual player input for triggers
    const inputText = text.toLowerCase();

    // Initialize trigger tracking for this turn if not exists
    if (!state.currentTurnTriggers) {
      state.currentTurnTriggers = [];
    }

    // Check all storycards for trigger matches in player input
    storyCards.forEach(card => {
      // Skip the WTG Data storycard, Current Date and Time card, and WTG Settings card (already handled)
      if (card.title === "WTG Data" || card.title === "Current Date and Time" || card.title === "World Time Generator Settings") {
        return;
      }

      // Check if this card has keys (triggers) and if any are mentioned in the input text
      if (card.keys && areCardTriggersMentioned(card, inputText)) {
        // Split the keys by comma to get individual triggers
        const triggers = card.keys.split(",").map(trigger => trigger.trim());

        // Check each trigger to see if it matches the input text
        for (const trigger of triggers) {
          const lowerTrigger = trigger.toLowerCase();

          // Check for exact match first
          if (inputText.includes(lowerTrigger)) {
            // Add to current turn triggers for turn data
            if (!state.currentTurnTriggers.includes(trigger)) {
              state.currentTurnTriggers.push(trigger);
            }
            break;
          }

          // Handle multi-word names: if there are two words or more in the trigger,
          // also check if the first word matches
          const triggerWords = lowerTrigger.split(/\s+/);
          if (triggerWords.length >= 2) {
            // Check if the first word of the multi-word trigger appears in the input text
            if (inputText.includes(triggerWords[0])) {
              // Add to current turn triggers for turn data
              if (!state.currentTurnTriggers.includes(trigger)) {
                state.currentTurnTriggers.push(trigger);
              }
              break;
            }
          }
        }
      }
    });
  }

  return modifiedText;
}

function oracleInput(text) {
  if (!text) {
    return { text };
  }
  if (isCommandText(text)) {
    return { text };
  }
  const attemptRegex = /(?:^|\n)\s*>?\s*(.*)\b(try|tries|trying|attempt|attempts|attempting)\b/i;
  if (!attemptRegex.test(text)) {
    return { text };
  }
  const Success = 0.5; // higher means less chance to succeed
  const Barely = Success + 0.2; // higher means higher chance of barely success
  const CritSuccess = 0.9; // higher means less chance for a crit success
  const CritFail = 0.1; // higher means higher chance of a crit failure
  const outcome = (v, w, s) =>
    (w = text.match(attemptRegex)) &&
    !((w[1].match(/"/g) ?? []).length % 2)
      ? ((s = v > Success) ? "And " : "But ") +
        w[1].replace(/^You\b/, "you").replace(/,$/, " and") +
        ((s && v < Barely) ? " barely" : "") +
        (s ? " succeed" : " fail") +
        (w[2].match(/s$/i) ? "s" : "") +
        ((v > CritSuccess || v < CritFail) ? (s ? " perfectly" : " horribly") : "") +
        (s ? "." : "!")
      : "";

  if (!state.oracle) {
    state.oracle = { frontMemory: "", action: 0 };
  }

  if (state.oracle.action == info.actionCount) {
    if (state.oracle.frontMemory) {
      state.memory.frontMemory = state.oracle.frontMemory;
      if (!isCommandText(text)) {
        text = `${text}\n${state.oracle.frontMemory}`.trim();
      }
    }
  } else {
    oracle();
  }

  function oracle() {
    state.oracle.frontMemory = outcome(Math.random());
    if (state.oracle.frontMemory) {
      state.memory.frontMemory = state.oracle.frontMemory;
      state.message = state.oracle.frontMemory;
      if (!isCommandText(text)) {
        text = `${text}\n${state.oracle.frontMemory}`.trim();
      }
    }
    state.oracle.action = info.actionCount;
  }

  return { text };
}

function betterSay(text) {
  if (!text) {
    return { text };
  }
  if (text.match(/".*,,/)) {
    text = text
      .replace(/says? "\s*(\S)(.*),,\s*(\S)/i, (m, a, b, c) => a.toLowerCase() + b.trim() + ', "' + c.toUpperCase())
      .replace(/(you |i )(your? |i )(\S)/i, (m, a, b, c) => b.charAt(0).toUpperCase() + b.slice(1) + c.toLowerCase());
  } else {
    text = text
      .replace(/\bi says/i, "I say")
      .replace(/(says?) "\s*(\S)/i, (m, a, b) => a + ', "' + b.toUpperCase());
  }
  if (text.match(/[^.,?!]"\n/)) {
    text = text.replace(/\s*"\n/, '."\n');
  } else {
    text = text.replace(/(say)(s?, ".*)([,?!]")/i, (m, a, b, c) => (c == ',"' ? "begin" : c == '?"' ? "ask" : c == '!"' ? "shout" : "") + b.trim() + c);
  }
  return { text };
}

// Don't modify this part
modifier(text);
