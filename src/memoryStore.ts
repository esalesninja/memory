import * as fs from "fs";
import * as path from "path";
import { GLOBAL_MEMORY_FILE, MEMORIES_DIR } from "./constants";
import type { ChatContext } from "./chatContext";
import { upsertMemoryLine } from "./memoryFormat";

export interface MemoryLine {
  line: number;
  content: string;
}

export interface MemoryFileContents {
  filePath: string;
  fileName: string;
  lines: MemoryLine[];
  raw: string;
}

function ensureMemoriesDir(): void {
  fs.mkdirSync(MEMORIES_DIR, { recursive: true });
}

function readLines(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function formatLines(lines: string[]): string {
  if (lines.length === 0) return "";
  return `${lines.join("\n")}\n`;
}

function buildMemoryContents(
  filePath: string,
  fileName: string,
): MemoryFileContents {
  const lines = readLines(filePath);
  return {
    filePath,
    fileName,
    lines: lines.map((content, index) => ({ line: index + 1, content })),
    raw: formatLines(lines),
  };
}

export function getGlobalMemoryPath(): string {
  return path.join(MEMORIES_DIR, GLOBAL_MEMORY_FILE);
}

export function readGlobalMemory(): MemoryFileContents {
  ensureMemoriesDir();
  return buildMemoryContents(getGlobalMemoryPath(), GLOBAL_MEMORY_FILE);
}

export function readChatMemory(chat: ChatContext): MemoryFileContents {
  ensureMemoriesDir();
  return buildMemoryContents(chat.memoryFilePath, chat.memoryFileName);
}

export function writeGlobalMemory(content: string): MemoryFileContents {
  ensureMemoriesDir();
  const filePath = getGlobalMemoryPath();
  const lines = upsertMemoryLine(readLines(filePath), content);
  fs.writeFileSync(filePath, formatLines(lines), "utf-8");
  return buildMemoryContents(filePath, GLOBAL_MEMORY_FILE);
}

export function writeChatMemory(
  chat: ChatContext,
  content: string,
): MemoryFileContents {
  ensureMemoriesDir();
  const lines = upsertMemoryLine(readLines(chat.memoryFilePath), content);
  fs.writeFileSync(chat.memoryFilePath, formatLines(lines), "utf-8");
  return buildMemoryContents(chat.memoryFilePath, chat.memoryFileName);
}

export function removeGlobalMemoryLine(line: number): MemoryFileContents {
  ensureMemoriesDir();
  const filePath = getGlobalMemoryPath();
  const lines = readLines(filePath);
  if (line < 1 || line > lines.length) {
    throw new Error(
      `Line ${line} is out of range. global.md has ${lines.length} line(s).`,
    );
  }
  lines.splice(line - 1, 1);
  fs.writeFileSync(filePath, formatLines(lines), "utf-8");
  return buildMemoryContents(filePath, GLOBAL_MEMORY_FILE);
}

export function removeChatMemoryLine(
  chat: ChatContext,
  line: number,
): MemoryFileContents {
  ensureMemoriesDir();
  const lines = readLines(chat.memoryFilePath);
  if (line < 1 || line > lines.length) {
    throw new Error(
      `Line ${line} is out of range. ${chat.memoryFileName} has ${lines.length} line(s).`,
    );
  }
  lines.splice(line - 1, 1);
  fs.writeFileSync(chat.memoryFilePath, formatLines(lines), "utf-8");
  return buildMemoryContents(chat.memoryFilePath, chat.memoryFileName);
}

export function formatMemoryBlock(
  label: string,
  contents: MemoryFileContents,
): string {
  if (contents.lines.length === 0) return "";

  const numbered = contents.lines
    .map(({ line, content }) => `${line}. ${content}`)
    .join("\n");

  return `<${label} file="${contents.fileName}">\n${numbered}\n</${label}>`;
}
