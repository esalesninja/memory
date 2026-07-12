import * as fs from "fs";
import * as path from "path";
import type { PromptPreprocessorController, ToolsProviderController } from "@lmstudio/sdk";
import {
  CONVERSATIONS_DIR,
  MEMORIES_DIR,
  UNNAMED_CHAT_LABEL,
} from "./constants";

export type PluginController = PromptPreprocessorController | ToolsProviderController;

export interface ChatContext {
  chatId: string;
  chatName: string | null;
  memoryFileName: string;
  memoryFilePath: string;
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function readConversationName(chatId: string): string | null {
  const conversationPath = path.join(
    CONVERSATIONS_DIR,
    `${chatId}.conversation.json`,
  );
  try {
    if (!fs.existsSync(conversationPath)) return null;
    const data = JSON.parse(fs.readFileSync(conversationPath, "utf-8")) as {
      name?: string | null;
    };
    const name = typeof data.name === "string" ? data.name.trim() : "";
    return name || null;
  } catch {
    return null;
  }
}

export function buildMemoryFileName(
  chatId: string,
  chatName: string | null,
): string {
  const nameSlug = chatName ? sanitizeFileName(chatName) : UNNAMED_CHAT_LABEL;
  const slug = nameSlug || UNNAMED_CHAT_LABEL;
  return `${chatId}_${slug}.md`;
}

function listExistingChatMemoryPaths(chatId: string): string[] {
  const paths: string[] = [];
  const legacyPath = path.join(MEMORIES_DIR, `${chatId}.md`);

  if (fs.existsSync(legacyPath)) {
    paths.push(legacyPath);
  }

  const prefix = `${chatId}_`;
  for (const entry of fs.readdirSync(MEMORIES_DIR)) {
    if (entry.startsWith(prefix) && entry.endsWith(".md")) {
      paths.push(path.join(MEMORIES_DIR, entry));
    }
  }

  return paths;
}

function readNonEmptyLines(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function writeLines(filePath: string, lines: string[]): void {
  if (lines.length === 0) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}

function mergeMemoryFiles(sourcePath: string, targetPath: string): void {
  const merged = [...readNonEmptyLines(targetPath), ...readNonEmptyLines(sourcePath)];
  writeLines(targetPath, merged);
  if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
}

function pickSourcePath(
  chatId: string,
  existingPaths: string[],
  targetPath: string,
): string | null {
  const candidates = existingPaths.filter((p) => p !== targetPath);
  if (candidates.length === 0) return null;

  const unnamedPath = path.join(
    MEMORIES_DIR,
    `${chatId}_${UNNAMED_CHAT_LABEL}.md`,
  );
  const legacyPath = path.join(MEMORIES_DIR, `${chatId}.md`);

  return (
    candidates.find((p) => p === unnamedPath) ??
    candidates.find((p) => p === legacyPath) ??
    candidates[0]
  );
}

function ensureChatMemoryPath(chatId: string, memoryFileName: string): string {
  fs.mkdirSync(MEMORIES_DIR, { recursive: true });

  const targetPath = path.join(MEMORIES_DIR, memoryFileName);
  const existingPaths = listExistingChatMemoryPaths(chatId);

  if (fs.existsSync(targetPath)) {
    for (const otherPath of existingPaths) {
      if (otherPath !== targetPath) {
        mergeMemoryFiles(otherPath, targetPath);
      }
    }
    return targetPath;
  }

  const sourcePath = pickSourcePath(chatId, existingPaths, targetPath);
  if (sourcePath) {
    fs.renameSync(sourcePath, targetPath);

    for (const otherPath of existingPaths) {
      if (otherPath !== sourcePath && fs.existsSync(otherPath)) {
        mergeMemoryFiles(otherPath, targetPath);
      }
    }
  }

  return targetPath;
}

export function resolveChatContext(ctl: PluginController): ChatContext | null {
  try {
    const workingDirectory = ctl.getWorkingDirectory();
    const chatId = path.basename(workingDirectory);
    if (!chatId || chatId === "." || chatId === "..") return null;

    const chatName = readConversationName(chatId);
    const memoryFileName = buildMemoryFileName(chatId, chatName);
    const memoryFilePath = ensureChatMemoryPath(chatId, memoryFileName);

    return {
      chatId,
      chatName,
      memoryFileName,
      memoryFilePath,
    };
  } catch {
    return null;
  }
}
