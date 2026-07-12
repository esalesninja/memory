import { ChatMessage, type PromptPreprocessorController } from "@lmstudio/sdk";
import { configSchematics } from "./config";
import { MIN_PROMPT_LENGTH, REINJECT_INTERVAL_MS, REMEMBER_CHAT_REGEX, REMEMBER_GLOBAL_REGEX, REMEMBER_PREFIX_REGEX } from "./constants";
import { resolveChatContext } from "./chatContext";
import {
  annotateOverriddenGlobalLines,
  getChatOverrideKeys,
  MEMORY_FORMAT_GUIDANCE,
} from "./memoryFormat";
import {
  formatMemoryBlock,
  readChatMemory,
  readGlobalMemory,
  writeChatMemory,
  writeGlobalMemory,
} from "./memoryStore";

const stateMap = new Map<
  unknown,
  { fingerprint: string; injectedAt: number }
>();

function extractText(message: ChatMessage): string {
  return message.getText();
}

function injectIntoMessage(
  message: ChatMessage,
  injection: string,
): ChatMessage {
  const cloned = ChatMessage.from(message);
  cloned.replaceText(`${injection}\n\n---\n\n${cloned.getText()}`);
  return cloned;
}

type RememberScope = "global" | "chat";

type RememberRequest =
  | { kind: "auto"; scope: RememberScope; memoryText: string }
  | { kind: "choose"; memoryText: string };

function parseRememberRequest(text: string): RememberRequest | null {
  if (REMEMBER_CHAT_REGEX.test(text)) {
    const memoryText = text.replace(REMEMBER_CHAT_REGEX, "").trim();
    return memoryText ? { kind: "auto", scope: "chat", memoryText } : null;
  }

  if (REMEMBER_GLOBAL_REGEX.test(text)) {
    const memoryText = text.replace(REMEMBER_GLOBAL_REGEX, "").trim();
    return memoryText ? { kind: "auto", scope: "global", memoryText } : null;
  }

  if (REMEMBER_PREFIX_REGEX.test(text)) {
    const memoryText = text.replace(REMEMBER_PREFIX_REGEX, "").trim();
    return memoryText ? { kind: "choose", memoryText } : null;
  }

  return null;
}

function buildRememberChooseNote(memoryText: string): string {
  return [
    "[memory-plugin] The user wants to remember the following:",
    `"${memoryText}"`,
    "",
    MEMORY_FORMAT_GUIDANCE,
    "",
    "Decide the scope and save it with the appropriate tool:",
    "- write_memory_global — user identity and preferences, standing facts about the person, anything for all future conversations",
    "- write_memory — project/task/thread-specific context for this conversation only",
    "",
    "Examples: `User name: Yusuf` → global; `AI Name: Güzel` → global; \"we're using PostgreSQL in this project\" → chat as `Project database: PostgreSQL`.",
    "If scope is genuinely unclear, ask once whether it should be global or chat-only, then save.",
  ].join("\n");
}
function buildRememberSavedNote(
  scope: RememberScope,
  fileName: string,
  content: string,
): string {
  const target = scope === "global" ? "global.md" : fileName;
  return [
    "[memory-plugin] The following was automatically saved to " + target + ":",
    `"${content}"`,
    "",
    "Memory storage is already complete. Do not call write_memory tools for this.",
  ].join("\n");
}

function stripRememberPrefix(message: ChatMessage, memoryText: string): ChatMessage {
  const cloned = ChatMessage.from(message);
  cloned.replaceText(memoryText);
  return cloned;
}

function formatGlobalMemoryBlock(
  globalMemory: ReturnType<typeof readGlobalMemory>,
  chatLines: Array<{ content: string }>,
): string {
  if (globalMemory.lines.length === 0) return "";

  const chatOverrideKeys = getChatOverrideKeys(chatLines);
  const numbered = annotateOverriddenGlobalLines(
    globalMemory.lines,
    chatOverrideKeys,
  ).join("\n");

  return `<global_memories file="${globalMemory.fileName}">\n${numbered}\n</global_memories>`;
}

function buildAutoInjectBlock(
  globalBlock: string,
  chatBlock: string,
  chatId: string | null,
  chatName: string | null,
): string {
  const parts: string[] = [
    "You have access to persistent memories stored as line-based markdown files in ~/.lmstudio/memories/.",
    "Global memories apply to every conversation. Chat memories apply only to this conversation.",
    "",
    MEMORY_FORMAT_GUIDANCE,
    "",
    "`remember global:` and `remember chat:` are saved automatically by the plugin (still use `Label: value` when possible).",
    "For `remember: <fact>` or natural requests like \"remember my name\" or \"your name is Güzel\", choose the scope and save with the right tool.",
    "- write_memory_global — user identity and preferences, AI persona/name/tone, anything for all future conversations",
    "- write_memory — project/task/thread-specific context for this conversation only",
    "Use `remove_memory_global` with a 1-based line number to delete a global memory.",
    "Use `remove_memory` with a 1-based line number to delete a chat-specific memory.",
    "Use `read_memory_global` or `read_memory` to inspect stored memories.",
  ];

  if (chatId) {
    parts.push("");
    parts.push(`Current chat id: ${chatId}`);
    parts.push(`Current chat name: ${chatName ?? "unnamed"}`);
  }

  if (globalBlock) {
    parts.push("");
    parts.push(globalBlock);
  }

  if (chatBlock) {
    parts.push("");
    parts.push(chatBlock);
  }

  return parts.join("\n");
}

function computeFingerprint(
  globalRaw: string,
  chatRaw: string,
  chatFileName: string,
): string {
  return `${chatFileName}|${globalRaw}|${chatRaw}`;
}

export async function promptPreprocessor(
  ctl: PromptPreprocessorController,
  userMessage: ChatMessage,
): Promise<ChatMessage | string> {
  try {
    const text = extractText(userMessage);
    if (text.trim().length < MIN_PROMPT_LENGTH) return userMessage;

    const config = ctl.getPluginConfig(configSchematics);
    const autoInject = (config.get("autoInject") as string) === "on";

    const rememberRequest = parseRememberRequest(text);
    if (rememberRequest) {
      if (rememberRequest.kind === "choose") {
        const stripped = stripRememberPrefix(
          userMessage,
          rememberRequest.memoryText,
        );
        return injectIntoMessage(
          stripped,
          buildRememberChooseNote(rememberRequest.memoryText),
        );
      }

      const { scope, memoryText } = rememberRequest;
      const chat = resolveChatContext(ctl);

      if (scope === "chat") {
        if (!chat) return userMessage;
        writeChatMemory(chat, memoryText);
      } else {
        writeGlobalMemory(memoryText);
      }

      const fileName =
        scope === "global" ? "global.md" : chat!.memoryFileName;
      const updatedGlobal = readGlobalMemory();
      const updatedChat = chat ? readChatMemory(chat) : null;
      stateMap.set(ctl, {
        fingerprint: computeFingerprint(
          updatedGlobal.raw,
          updatedChat?.raw ?? "",
          chat?.memoryFileName ?? "none",
        ),
        injectedAt: Date.now(),
      });

      const stripped = stripRememberPrefix(userMessage, memoryText);
      return injectIntoMessage(
        stripped,
        buildRememberSavedNote(scope, fileName, memoryText),
      );
    }

    if (!autoInject) return userMessage;

    const chat = resolveChatContext(ctl);
    const globalMemory = readGlobalMemory();
    const chatMemory = chat ? readChatMemory(chat) : null;

    const fingerprint = computeFingerprint(
      globalMemory.raw,
      chatMemory?.raw ?? "",
      chat?.memoryFileName ?? "none",
    );
    const now = Date.now();
    const state = stateMap.get(ctl) ?? { fingerprint: "", injectedAt: 0 };
    const memoriesChanged = fingerprint !== state.fingerprint;
    const intervalElapsed = now - state.injectedAt > REINJECT_INTERVAL_MS;
    const hasMemories =
      globalMemory.lines.length > 0 || (chatMemory?.lines.length ?? 0) > 0;
    const shouldSkip =
      hasMemories
        ? !memoriesChanged && !intervalElapsed
        : state.injectedAt !== 0 && !intervalElapsed;

    if (shouldSkip) return userMessage;

    stateMap.set(ctl, { fingerprint, injectedAt: now });

    const globalBlock = formatGlobalMemoryBlock(
      globalMemory,
      chatMemory?.lines ?? [],
    );
    const chatBlock = chatMemory
      ? formatMemoryBlock("chat_memories", chatMemory)
      : "";

    return injectIntoMessage(
      userMessage,
      buildAutoInjectBlock(
        globalBlock,
        chatBlock,
        chat?.chatId ?? null,
        chat?.chatName ?? null,
      ),
    );
  } catch (err) {
    console.warn("memory preprocessor error:", err);
    return userMessage;
  }
}
