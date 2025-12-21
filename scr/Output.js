// Output Script

// Every script needs a modifier function
const modifier = (text) => {
  try {
    text = oracleOutput(text).text;
    text = WTG_Output(text);
    text = CI_Output(text);
    return { text };
  } catch (err) {
    return { text };
  }
};

function oracleOutput(text) {
  if (!state.oracle) {
    return { text };
  }
  state.oracle.action == info.actionCount - 1
    ? (state.memory.frontMemory = state.oracle.frontMemory)
    : (state.memory.frontMemory = "");
  return { text };
}

// output.js - Handle AI responses and update storycards for the new WTG implementation

function WTG_Output(text) {
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};

  // Initialize mode if not set (default to lightweight)

  let modifiedText = text;

  // Check if WTG is disabled entirely (Normal mode only)
  if (!isLightweightMode() && getWTGBooleanSetting("Disable WTG Entirely")) {
    return ensureLeadingSpace(text);
  }

  // Sync settime initialization flag from storycard if not set in state
  if (!state.settimeInitialized) {
    const dataCard = getWTGDataCard();
    if (dataCard && dataCard.entry && dataCard.entry.includes('[SETTIME_INITIALIZED]')) {
      state.settimeInitialized = true;
    }
  }

  // Check for [settime] command in storycards at scenario start
  if (state.startingDate === '01/01/1900' && info.actionCount <= 1) {
    // Scan all storycards for [settime] commands
    for (const card of storyCards) {
      if (card.entry) {
        // Match [settime date time] format - handle both "mm/dd/yyyy" and variations
        const settimeMatch = card.entry.match(/\[settime\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+(.+?)\]/i);
        if (settimeMatch) {
          let dateStr = settimeMatch[1];
          let timeStr = settimeMatch[2].trim();
          
          // Normalize date separators
          dateStr = dateStr.replace(/[.-]/g, '/');
          let [part1, part2, year] = dateStr.split('/').map(Number);
          if (year < 100) year += 2000;
          let month = part1;
          let day = part2;
          if (month > 12 && day <= 12) [month, day] = [day, part1];
          
          if (isValidDate(month, day, year)) {
            // Set the starting date and time
            state.startingDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
            state.startingTime = normalizeTime(timeStr);
            state.turnTime = {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
            const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
            state.currentDate = currentDate;
            state.currentTime = currentTime;
            state.changed = true;

            // Mark settime as initialized since we auto-detected it
            markSettimeAsInitialized();

            // Initialize required system storycards
            updateDateTimeCard();
            getWTGSettingsCard();
            getCooldownCard();
            if (!isLightweightMode()) {
              getWTGDataCard();
            }

            // Remove the [settime] command from the storycard
            card.entry = card.entry.replace(/\[settime\s+\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\s+.+?\]/i, '').trim();

            // Skip the opening prompt and let AI respond
            // Don't return here, just continue to normal processing
            break;
          }
        }
      }
    }
  }

  // If settime has NOT been initialized and we're at the start, inject the prompt
  if (!hasSettimeBeenInitialized() && state.startingDate === '01/01/1900' && state.startingTime === 'Unknown') {
    modifiedText = ' Please switch to story mode and use the command, [settime mm/dd/yyyy time] to set a custom starting date and time. (eg: [settime 01/01/1900 12:00 am])\n\nTo report bugs, message me on discord: thedenial. (it has a period at the end of it)';
    return ensureLeadingSpace(modifiedText);
  }

  const isDescribeTurn = state.ci && state.ci.pendingDescribe;

  const focusTags = extractFocusTags(text);
  if (focusTags.length > 0) {
    const data = getFocusData();
    focusTags.forEach(tag => {
      const list = data[tag.type] || [];
      const existingIndex = list.findIndex(entry => entry.name.toLowerCase() === tag.name.toLowerCase());
      let pinned = false;
      if (existingIndex >= 0) {
        pinned = list[existingIndex].pinned;
        list.splice(existingIndex, 1);
      }
      list.unshift({ name: tag.name, pinned });
      data[tag.type] = pruneFocusList(list);
    });
    saveFocusData(data);
  }

  // Get the last action from history to determine action type
  let lastAction = null;
  let actionType = "continue"; // Default to continue if no player action found
  
  // Look for the most recent player action (do, say, story)
  for (let i = history.length - 1; i >= 0; i--) {
    const action = history[i];
    if (action.type === "do" || action.type === "say" || action.type === "story") {
      lastAction = action;
      actionType = action.type;
      break;
    }
  }
  
  // Initialize generatedEntities array for tracking
  const generatedEntities = [];

  // Check for LLM time commands at the start of the output
  let timeAdjustedByCommand = false;
  const commandRegex = /^\s*\((sleep|advance)\s+(\d+)\s+(\w+)\)\s*/;
  const commandMatch = modifiedText.match(commandRegex);
  if (commandMatch) {
    const verb = commandMatch[1];
    const amount = parseInt(commandMatch[2], 10);
    const unit = commandMatch[3].toLowerCase();
    const fullCommand = commandMatch[0].trim();

    // Check if cooldown is active before processing command
    let shouldProcessCommand = true;
    if (verb === 'sleep' && isSleepCooldownActive()) {
      shouldProcessCommand = false;
    } else if (verb === 'advance' && isAdvanceCooldownActive()) {
      shouldProcessCommand = false;
    }

    // Only process command if no active cooldown
    if (shouldProcessCommand) {
      // Convert to days, hours, minutes
      let days = 0, hours = 0, minutes = 0;
    switch (unit) {
      case 'years':
      case 'year':
        days = amount * 365; // Approximate
        break;
      case 'months':
      case 'month':
        days = amount * 30; // Approximate
        break;
      case 'weeks':
      case 'week':
        days = amount * 7;
        break;
      case 'days':
      case 'day':
        days = amount;
        break;
      case 'hours':
      case 'hour':
        hours = amount;
        break;
      case 'minutes':
      case 'minute':
        minutes = amount;
        break;
      default:
        // Invalid unit, ignore command
        break;
    }

    // Apply the time jump if we have valid values
    if (days > 0 || hours > 0 || minutes > 0) {
      state.turnTime = addToTurnTime(state.turnTime, { days, hours, minutes });
      const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
      state.changed = true;
      timeAdjustedByCommand = true;

      // Store the command for turn data
      state.aiCommandThisTurn = fullCommand;

      // Set cooldown based on command type using helper functions
      if (verb === 'sleep') {
        setSleepCooldown({hours: 8});
      } else if (verb === 'advance') {
        setAdvanceCooldown({minutes: 5});
      }

      // Store pending command information for time adjustment fallback in cooldown card
      const cooldownCard = getCooldownCard();
      let entry = cooldownCard.entry || "";
      if (verb === 'sleep') {
        const currentTT = formatTurnTime(state.turnTime);
        const {currentDate: initDate, currentTime: initTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
        entry += `\nLast sleep initiated: ${initDate} ${initTime} (${currentTT})\n`;
        entry += `Sleep command: ${fullCommand}\n`;
      } else if (verb === 'advance') {
        const currentTT = formatTurnTime(state.turnTime);
        const {currentDate: initDate, currentTime: initTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
        entry += `\nLast advance initiated: ${initDate} ${initTime} (${currentTT})\n`;
        entry += `Advance command: ${fullCommand}\n`;
      }
      cooldownCard.entry = entry.trim();

        // Remove command from output if Debug Mode is false
        if (!getWTGBooleanSetting("Debug Mode")) {
          modifiedText = modifiedText.replace(commandRegex, '').trim();
        }
      }
    }
    // ALWAYS remove commands during cooldown, even if Debug Mode is true
    if (!shouldProcessCommand) {
      modifiedText = modifiedText.replace(commandRegex, '').trim();
    } else if (!getWTGBooleanSetting("Debug Mode")) {
      // Normal case: remove command if debug mode is false
      modifiedText = modifiedText.replace(commandRegex, '').trim();
    }
  } else {
    // No command this turn
    state.aiCommandThisTurn = null;
  }

  // Final sanitation: remove any remaining (sleep ...) or (advance ...) commands anywhere in the text
  // ALWAYS remove if either cooldown is active, OR if debug mode is false
  const shouldRemoveAllCommands = isSleepCooldownActive() || isAdvanceCooldownActive() || !getWTGBooleanSetting("Debug Mode");
  if (shouldRemoveAllCommands) {
    modifiedText = modifiedText
      .replace(/\((?:sleep|advance)[^)]*\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  modifiedText = stripFocusTags(modifiedText);

  // Process any existing turn time marker in the text
  const ttMatch = modifiedText.match(/\[\[(.*?)\]\]$/);
  let parsedTT = ttMatch ? parseTurnTime(ttMatch[1]) : null;
  let narrative = ttMatch ? modifiedText.replace(/\[\[.*\]\]$/, '').trim() : modifiedText.trim();
  let charCount = narrative.length;
  
  // Get time duration multiplier from WTG Settings storycard
  let timeMultiplier = 1.0;
  const settingsCard = getWTGSettingsCard();
  if (settingsCard && settingsCard.entry) {
    const multiplierMatch = settingsCard.entry.match(/Time Duration Multiplier: ([\d.]+)/);
    if (multiplierMatch) {
      timeMultiplier = Math.max(0, parseFloat(multiplierMatch[1]) || 1.0);
    }
  }
  
  // Calculate minutes to add based on character count and time multiplier
  let minutesToAdd;
  if (getWTGBooleanSetting("Enable Dynamic Time")) {
    const turnText = (lastAction ? lastAction.text : '') + ' ' + narrative;
    const dynamicFactor = getDynamicTimeFactor(turnText);
    minutesToAdd = Math.floor((charCount / 700) * timeMultiplier * dynamicFactor);
  } else {
    minutesToAdd = Math.floor((charCount / 700) * timeMultiplier);
  }

  // Add warning if AI altered turn time metadata
  if (parsedTT) {
    const currentTTForm = formatTurnTime(state.turnTime);
    if (ttMatch[1] !== currentTTForm) {
      modifiedText += '\n[Warning: Turn time metadata altered by AI. Please retry.]';
    }
  }

  if (isDescribeTurn) {
    minutesToAdd = 0;
  }

  // Update turn time based on character count if starting time is not descriptive and no command was processed
  if (!isDescribeTurn && !timeAdjustedByCommand && state.startingTime !== 'Unknown' && minutesToAdd > 0) {
    state.turnTime = addToTurnTime(state.turnTime, {minutes: minutesToAdd});
    const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
    state.currentDate = currentDate;
    state.currentTime = currentTime;
    state.changed = true;
  }

  // Update text without turn time marker (since we're storing in storycard now)
  modifiedText = narrative;

  // Collect trigger mentions for turn data (only after proper time is set)
  let triggerMentions = [];
  if (!isDescribeTurn && modifiedText.trim() && state.currentDate !== '01/01/1900' && state.currentTime !== 'Unknown') {
    const responseText = modifiedText.toLowerCase();

    // Check all storycards for trigger matches in AI response
    storyCards.forEach(card => {
      // Skip the WTG Data storycard, Current Date and Time card, and WTG Settings card (already handled)
      if (card.title === "WTG Data" || card.title === "Current Date and Time" || card.title === "World Time Generator Settings") {
        return;
      }

      // Only track triggers for cards that haven't been discovered yet
      if (card.description && (card.description.includes("not yet discovered") || !hasTimestamp(card))) {
        // Check if this card has keys (triggers) and if any are mentioned in the response text
        if (card.keys && areCardTriggersMentioned(card, responseText)) {
          // Split the keys by comma to get individual triggers
          const triggers = card.keys.split(',').map(trigger => trigger.trim());

          // Check each trigger to see if it matches the response text
          for (const trigger of triggers) {
            const lowerTrigger = trigger.toLowerCase();

            // Check for exact match first
            if (responseText.includes(lowerTrigger)) {
              // Add to trigger mentions for turn data
              triggerMentions.push({cardTitle: card.title, trigger: trigger});
              break;
            }

            // Handle multi-word names: if there are two words or more in the trigger,
            // also check if the first word matches
            const triggerWords = lowerTrigger.split(/\s+/);
            if (triggerWords.length >= 2) {
              // Check if the first word of the multi-word trigger appears in the response text
              if (responseText.includes(triggerWords[0])) {
                // Add to trigger mentions for turn data
                triggerMentions.push({cardTitle: card.title, trigger: trigger});
                break;
              }
            }
          }
        }
      }
    });
  }


  // Helper function to extract first two sentences from text for turn data storage
  const extractFirstTwoSentences = (text) => {
    // Split text into sentences using common sentence endings
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Return first 1-2 sentences
    if (sentences.length === 0) {
      return text.substring(0, 200) + (text.length > 200 ? '...' : '');
    } else if (sentences.length === 1) {
      return sentences[0].trim() + '.';
    } else {
      return sentences.slice(0, 2).join('. ').trim() + '.';
    }
  };

  // Helper function to check if a timestamp is from the future (deprecated)
  const isTimestampDeprecated = (cardTimestamp, currentTimestamp) => {
    try {
      // Parse timestamps (format: MM/DD/YYYY HH:MM AM/PM)
      const parseTimestamp = (timestamp) => {
        const match = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}) ([AP]M)/);
        if (!match) return null;

        let [, month, day, year, hour, minute, ampm] = match;
        month = parseInt(month) - 1; // JavaScript months are 0-based
        day = parseInt(day);
        year = parseInt(year);
        hour = parseInt(hour);
        minute = parseInt(minute);

        // Convert to 24-hour format
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        return new Date(year, month, day, hour, minute);
      };

      const cardDate = parseTimestamp(cardTimestamp);
      const currentDate = parseTimestamp(currentTimestamp);

      if (!cardDate || !currentDate) return false;

      // If card timestamp is significantly in the future, mark as deprecated
      const timeDiff = cardDate.getTime() - currentDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Consider deprecated if more than 1 hour in the future (to account for minor time differences)
      return hoursDiff > 1;
    } catch (error) {
      // If parsing fails, don't mark as deprecated
      return false;
    }
  };

  // If we found a player action and it's not a continue, add turn data to WTG Data storycard
  if (!isDescribeTurn && lastAction && actionType !== "continue") {
    // Extract action + first 2 sentences from AI response for better consistency
    const responseSnippet = extractFirstTwoSentences(modifiedText);

    // Add turn data to WTG Data storycard with generated entities and trigger mentions
    const timestamp = formatTurnTime(state.turnTime);
    addTurnData(actionType, lastAction.text, responseSnippet, timestamp, generatedEntities, triggerMentions, state.aiCommandThisTurn);

    // Clear the current turn triggers after adding to turn data
    if (state.currentTurnTriggers) {
      delete state.currentTurnTriggers;
    }
  }

  // Independent mention detection for timestamp injection on existing cards (even if generation disabled)
  if (!isDescribeTurn && !getWTGBooleanSetting("Disable WTG Entirely")) {
    const fullText = (lastAction ? lastAction.text : '') + ' ' + text;
    const recentHistoryText = history.slice(-5).map(h => h.text).join(' '); // Last 5 actions
    const scanText = fullText + ' ' + recentHistoryText;

    // Get existing character cards that don't have timestamps
    const existingCharacterCards = storyCards.filter(c => c.type === "character" && c.title && !hasTimestamp(c));
    const detectedCharacters = extractCharacterNames(scanText);
    for (const card of existingCharacterCards) {
      // Only add timestamp if the character name was detected OR if card keywords are mentioned
      const nameDetected = detectedCharacters.some(name => name.toLowerCase() === card.title.toLowerCase());
      const keywordMentioned = isCardKeywordMentioned(card, scanText);
      if (nameDetected || keywordMentioned) {
        addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
      }
    }

    // Get existing location cards that don't have timestamps
    const existingLocationCards = storyCards.filter(c => (c.type === "location" || c.type === "place") && c.title && !hasTimestamp(c));
    for (const card of existingLocationCards) {
      const lowerTitle = card.title.toLowerCase();
      // Only add timestamp if title is mentioned OR if card keywords are mentioned
      const titleMentioned = scanText.toLowerCase().includes(lowerTitle);
      const keywordMentioned = isCardKeywordMentioned(card, scanText);
      if (titleMentioned || keywordMentioned) {
        addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
      }
    }
  }
  
  // Check if we should update storycards with timestamps for newly mentioned elements
  if (!isDescribeTurn && lastAction) {
    // Update timestamp for Current Date and Time card
    const dateTimeCard = storyCards.find(card => card.title === "Current Date and Time");
    if (dateTimeCard) {
      addTimestampToCard(dateTimeCard, `${state.currentDate} ${state.currentTime}`);
    }
  }

  // Update the Current Date and Time storycard if needed
  if (!isDescribeTurn && (state.changed || info.actionCount === 1 || info.actionCount % 5 === 0)) {
    updateDateTimeCard();
    delete state.changed;
  }

  delete state.insertMarker;

  // Ensure the modified text starts with a space
  modifiedText = ensureLeadingSpace(modifiedText);

  return modifiedText;
};



// Don't modify this part
modifier(text);
