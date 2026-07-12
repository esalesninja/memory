"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalMemoryPath = getGlobalMemoryPath;
exports.readGlobalMemory = readGlobalMemory;
exports.readChatMemory = readChatMemory;
exports.writeGlobalMemory = writeGlobalMemory;
exports.writeChatMemory = writeChatMemory;
exports.removeGlobalMemoryLine = removeGlobalMemoryLine;
exports.removeChatMemoryLine = removeChatMemoryLine;
exports.formatMemoryBlock = formatMemoryBlock;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const memoryFormat_1 = require("./memoryFormat");
function ensureMemoriesDir() {
    fs.mkdirSync(constants_1.MEMORIES_DIR, { recursive: true });
}
function readLines(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0);
}
function formatLines(lines) {
    if (lines.length === 0)
        return "";
    return `${lines.join("\n")}\n`;
}
function buildMemoryContents(filePath, fileName) {
    const lines = readLines(filePath);
    return {
        filePath,
        fileName,
        lines: lines.map((content, index) => ({ line: index + 1, content })),
        raw: formatLines(lines),
    };
}
function getGlobalMemoryPath() {
    return path.join(constants_1.MEMORIES_DIR, constants_1.GLOBAL_MEMORY_FILE);
}
function readGlobalMemory() {
    ensureMemoriesDir();
    return buildMemoryContents(getGlobalMemoryPath(), constants_1.GLOBAL_MEMORY_FILE);
}
function readChatMemory(chat) {
    ensureMemoriesDir();
    return buildMemoryContents(chat.memoryFilePath, chat.memoryFileName);
}
function writeGlobalMemory(content) {
    ensureMemoriesDir();
    const filePath = getGlobalMemoryPath();
    const lines = (0, memoryFormat_1.upsertMemoryLine)(readLines(filePath), content);
    fs.writeFileSync(filePath, formatLines(lines), "utf-8");
    return buildMemoryContents(filePath, constants_1.GLOBAL_MEMORY_FILE);
}
function writeChatMemory(chat, content) {
    ensureMemoriesDir();
    const lines = (0, memoryFormat_1.upsertMemoryLine)(readLines(chat.memoryFilePath), content);
    fs.writeFileSync(chat.memoryFilePath, formatLines(lines), "utf-8");
    return buildMemoryContents(chat.memoryFilePath, chat.memoryFileName);
}
function removeGlobalMemoryLine(line) {
    ensureMemoriesDir();
    const filePath = getGlobalMemoryPath();
    const lines = readLines(filePath);
    if (line < 1 || line > lines.length) {
        throw new Error(`Line ${line} is out of range. global.md has ${lines.length} line(s).`);
    }
    lines.splice(line - 1, 1);
    fs.writeFileSync(filePath, formatLines(lines), "utf-8");
    return buildMemoryContents(filePath, constants_1.GLOBAL_MEMORY_FILE);
}
function removeChatMemoryLine(chat, line) {
    ensureMemoriesDir();
    const lines = readLines(chat.memoryFilePath);
    if (line < 1 || line > lines.length) {
        throw new Error(`Line ${line} is out of range. ${chat.memoryFileName} has ${lines.length} line(s).`);
    }
    lines.splice(line - 1, 1);
    fs.writeFileSync(chat.memoryFilePath, formatLines(lines), "utf-8");
    return buildMemoryContents(chat.memoryFilePath, chat.memoryFileName);
}
function formatMemoryBlock(label, contents) {
    if (contents.lines.length === 0)
        return "";
    const numbered = contents.lines
        .map(({ line, content }) => `${line}. ${content}`)
        .join("\n");
    return `<${label} file="${contents.fileName}">\n${numbered}\n</${label}>`;
}
//# sourceMappingURL=memoryStore.js.map