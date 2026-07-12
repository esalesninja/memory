import * as os from "os";
import * as path from "path";

export const MEMORIES_DIR = path.join(os.homedir(), ".lmstudio", "memories");
export const CONVERSATIONS_DIR = path.join(
  os.homedir(),
  ".lmstudio",
  "conversations",
);
export const GLOBAL_MEMORY_FILE = "global.md";
export const UNNAMED_CHAT_LABEL = "unnamed";

export const MIN_PROMPT_LENGTH = 1;
export const REINJECT_INTERVAL_MS = 15 * 60 * 1_000;

export const REMEMBER_GLOBAL_REGEX = /^remember\s+global:\s*/i;
export const REMEMBER_CHAT_REGEX = /^remember\s+chat:\s*/i;
export const REMEMBER_PREFIX_REGEX = /^remember:\s*/i;
