// Input Script

// Every script needs a modifier function
const modifier = (text) => {
  try {
    //text = oracleInput(text).text;
    text = betterSay(text).text;
    text = CI_Input(text);
    return { text };
  } catch (err) {
    return { text };
  }
};

function isOutfitCommandText(text) {
  return /^\s*(?:You\s+|I\s+)?\/?(?:wear|takeoff|undress|start|end)\b/i.test(text || "");
}

function oracleInput(text) {
  if (!text) {
    return { text };
  }
  if (isOutfitCommandText(text)) {
    return { text };
  }
  const Success = 0.5; // higher means less chance to succeed
  const Barely = Success + 0.2; // higher means higher chance of barely success
  const CritSuccess = 0.9; // higher means less chance for a crit success
  const CritFail = 0.1; // higher means higher chance of a crit failure
  const outcome = (v, w, s) =>
    (w = text.match(/(?:^|\n)\s*>?\s*(.*)\b(try|tries|trying|attempt|attempts|attempting)\b/i)) &&
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
      if (!isOutfitCommandText(text)) {
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
      if (!isOutfitCommandText(text)) {
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
