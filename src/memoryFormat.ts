export const MEMORY_KEY_PATTERN = /^([^:]+):\s*.+$/;

export const MEMORY_PERSPECTIVE_GUIDANCE = [
  "## Pronoun & perspective rules",
  "When saving memories from user input or answering from stored memories, translate the user's perspective correctly:",
  "- User says \"you\" / \"your\" → they mean the AI. Map to `AI ...` labels (e.g. `AI Name: Güzel`).",
  "- User says \"I\" / \"me\" / \"my\" → they mean themselves. Map to `User ...` labels (e.g. `User name: Yusuf`).",
  "",
  "When reading memories back in conversation:",
  "- `AI Name: Güzel` → your name (the AI) is Güzel",
  "- `User name: Yusuf` → the user's name is Yusuf",
  "",
  "Example input: \"Your name is Güzel, and my name is Yusuf.\"",
  "→ Save as: `AI Name: Güzel` and `User name: Yusuf`",
  "→ If asked \"What is your name and what is my name?\", answer: \"My name is Güzel, and your name is Yusuf.\"",
].join("\n");

export const MEMORY_CONTINUATION_GUIDANCE = [
  "## Conversational continuation",
  "After you read, write, or update a memory, do not give a sterile confirmation.",
  "Seamlessly transition back into the chat: acknowledge the change in character (use your assigned persona from `AI Name`, `AI Tone`, etc.), then ask a relevant open-ended question or offer the next step to keep the conversation flowing naturally.",
].join("\n");

export const MEMORY_FORMAT_GUIDANCE = [
  "Store every memory as one line: `Label: value`. Never store ambiguous pronouns — always resolve to `AI ...` or `User ...` labels.",
  "AI / persona facts: use an `AI` prefix — e.g. `AI Name: Güzel`, `AI Tone: Direct`, `AI Personality: concise and direct`.",
  "User facts: use a `User` prefix — e.g. `User name: Yusuf`, `User favourite food: Lahmacun`.",
  "When the user assigns your name, tone, or personality, save it as an `AI ...` memory, not as the user's name.",
  "Same label in one file: the newer line replaces the older line automatically.",
  "Same label in global and chat: the chat value wins at read time; do not delete the global line for cross-scope conflicts.",
  "",
  MEMORY_PERSPECTIVE_GUIDANCE,
  "",
  MEMORY_CONTINUATION_GUIDANCE,
].join("\n");

export function getMemoryKey(content: string): string | null {
  const match = content.trim().match(MEMORY_KEY_PATTERN);
  return match ? match[1].trim() : null;
}

export function normalizeMemoryKey(key: string): string {
  return key.trim().toLowerCase();
}

export function upsertMemoryLine(lines: string[], content: string): string[] {
  const normalized = content.trim();
  if (!normalized) {
    throw new Error("Memory content cannot be empty.");
  }

  const newKey = getMemoryKey(normalized);
  if (!newKey) {
    return [...lines, normalized];
  }

  const normalizedNewKey = normalizeMemoryKey(newKey);
  const filtered = lines.filter((line) => {
    const key = getMemoryKey(line);
    if (!key) return true;
    return normalizeMemoryKey(key) !== normalizedNewKey;
  });
  filtered.push(normalized);
  return filtered;
}

export function getChatOverrideKeys(
  chatLines: Array<{ content: string }>,
): Set<string> {
  const keys = new Set<string>();
  for (const { content } of chatLines) {
    const key = getMemoryKey(content);
    if (key) keys.add(normalizeMemoryKey(key));
  }
  return keys;
}

export function annotateOverriddenGlobalLines(
  globalLines: Array<{ line: number; content: string }>,
  chatOverrideKeys: Set<string>,
): string[] {
  return globalLines.map(({ line, content }) => {
    const key = getMemoryKey(content);
    if (key && chatOverrideKeys.has(normalizeMemoryKey(key))) {
      return `${line}. ${content} (overridden by chat memory)`;
    }
    return `${line}. ${content}`;
  });
}
