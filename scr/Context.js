// Context Script

// Every script needs a modifier function
const modifier = (text) => {
  text = CI_Context(text);
  return { text };
};

// Don't modify this part
modifier(text);
