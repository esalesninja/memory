import { tool, type ToolsProviderController } from "@lmstudio/sdk";
import { z } from "zod";
import { resolveChatContext } from "./chatContext";
import {
  readChatMemory,
  readGlobalMemory,
  removeChatMemoryLine,
  removeGlobalMemoryLine,
  writeChatMemory,
  writeGlobalMemory,
} from "./memoryStore";

export async function toolsProvider(ctl: ToolsProviderController) {
  const readMemoryGlobalTool = tool({
    name: "read_memory_global",
    description:
      "Read all global memories from ~/.lmstudio/memories/global.md. Each line is one memory entry.",
    parameters: {},
    implementation: async () => {
      const memory = readGlobalMemory();
      return {
        file: memory.fileName,
        path: memory.filePath,
        lineCount: memory.lines.length,
        lines: memory.lines,
      };
    },
  });

  const readMemoryTool = tool({
    name: "read_memory",
    description:
      "Read memories for the current chat from ~/.lmstudio/memories/<chat-id>_<chat-name>.md (uses 'unnamed' when the chat has no name). Each line is one memory entry.",
    parameters: {},
    implementation: async () => {
      const chat = resolveChatContext(ctl);
      if (!chat) {
        return {
          success: false,
          error: "Could not resolve the current chat id from the working directory.",
        };
      }

      const memory = readChatMemory(chat);
      return {
        success: true,
        chatId: chat.chatId,
        chatName: chat.chatName,
        file: memory.fileName,
        path: memory.filePath,
        lineCount: memory.lines.length,
        lines: memory.lines,
      };
    },
  });

  const writeMemoryGlobalTool = tool({
    name: "write_memory_global",
    description:
      "Append or replace a line in ~/.lmstudio/memories/global.md. Use `Label: value` format. User facts: `User name: Yusuf`. AI persona: `AI Name: Güzel`, `AI Tone: Direct`. Same label replaces the older global line. Prefer for facts that apply across all conversations.",
    parameters: {
      content: z
        .string()
        .min(1)
        .describe(
          "One memory line as `Label: value`. Examples: `User name: Yusuf`, `AI Name: Güzel`, `User favourite food: Lahmacun`. Never use ambiguous phrasing like \"My name is...\".",
        ),
    },
    implementation: async ({ content }) => {
      const memory = writeGlobalMemory(content);
      const saved = memory.lines[memory.lines.length - 1];
      return {
        success: true,
        file: memory.fileName,
        path: memory.filePath,
        savedLine: saved?.line ?? memory.lines.length,
        content: saved?.content ?? content.trim(),
      };
    },
  });

  const writeMemoryTool = tool({
    name: "write_memory",
    description:
      "Append or replace a line in the current chat memory file. Use `Label: value` format. Same label replaces the older chat line. Chat values override global values with the same label. Use for project/task/thread-specific context.",
    parameters: {
      content: z
        .string()
        .min(1)
        .describe(
          "One memory line as `Label: value`. Examples: `Project database: PostgreSQL`, `AI Tone: playful` (chat-only override).",
        ),
    },
    implementation: async ({ content }) => {
      const chat = resolveChatContext(ctl);
      if (!chat) {
        return {
          success: false,
          error: "Could not resolve the current chat id from the working directory.",
        };
      }

      const memory = writeChatMemory(chat, content);
      const saved = memory.lines[memory.lines.length - 1];
      return {
        success: true,
        chatId: chat.chatId,
        chatName: chat.chatName,
        file: memory.fileName,
        path: memory.filePath,
        savedLine: saved?.line ?? memory.lines.length,
        content: saved?.content ?? content.trim(),
      };
    },
  });

  const removeMemoryGlobalTool = tool({
    name: "remove_memory_global",
    description:
      "Remove a memory line by its 1-based line number from ~/.lmstudio/memories/global.md.",
    parameters: {
      line: z
        .number()
        .int()
        .min(1)
        .describe("1-based line number to remove from global.md."),
    },
    implementation: async ({ line }) => {
      const memory = removeGlobalMemoryLine(line);
      return {
        success: true,
        file: memory.fileName,
        path: memory.filePath,
        remainingLines: memory.lines.length,
        lines: memory.lines,
      };
    },
  });

  const removeMemoryTool = tool({
    name: "remove_memory",
    description:
      "Remove a memory line by its 1-based line number from the current chat memory file.",
    parameters: {
      line: z
        .number()
        .int()
        .min(1)
        .describe("1-based line number to remove from the current chat memory file."),
    },
    implementation: async ({ line }) => {
      const chat = resolveChatContext(ctl);
      if (!chat) {
        return {
          success: false,
          error: "Could not resolve the current chat id from the working directory.",
        };
      }

      const memory = removeChatMemoryLine(chat, line);
      return {
        success: true,
        chatId: chat.chatId,
        chatName: chat.chatName,
        file: memory.fileName,
        path: memory.filePath,
        remainingLines: memory.lines.length,
        lines: memory.lines,
      };
    },
  });

  return [
    readMemoryGlobalTool,
    readMemoryTool,
    writeMemoryGlobalTool,
    writeMemoryTool,
    removeMemoryGlobalTool,
    removeMemoryTool,
  ];
}
