// Output Script

// Every script needs a modifier function
const modifier = (text) => {
  try {
    text = oracleOutput(text).text;
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

// Don't modify this part
modifier(text);
