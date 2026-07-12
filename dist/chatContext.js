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
exports.buildMemoryFileName = buildMemoryFileName;
exports.resolveChatContext = resolveChatContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
function sanitizeFileName(name) {
    const trimmed = name.trim();
    if (!trimmed)
        return "";
    return trimmed
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
}
function readConversationName(chatId) {
    const conversationPath = path.join(constants_1.CONVERSATIONS_DIR, `${chatId}.conversation.json`);
    try {
        if (!fs.existsSync(conversationPath))
            return null;
        const data = JSON.parse(fs.readFileSync(conversationPath, "utf-8"));
        const name = typeof data.name === "string" ? data.name.trim() : "";
        return name || null;
    }
    catch {
        return null;
    }
}
function buildMemoryFileName(chatId, chatName) {
    const nameSlug = chatName ? sanitizeFileName(chatName) : constants_1.UNNAMED_CHAT_LABEL;
    const slug = nameSlug || constants_1.UNNAMED_CHAT_LABEL;
    return `${chatId}_${slug}.md`;
}
function listExistingChatMemoryPaths(chatId) {
    const paths = [];
    const legacyPath = path.join(constants_1.MEMORIES_DIR, `${chatId}.md`);
    if (fs.existsSync(legacyPath)) {
        paths.push(legacyPath);
    }
    const prefix = `${chatId}_`;
    for (const entry of fs.readdirSync(constants_1.MEMORIES_DIR)) {
        if (entry.startsWith(prefix) && entry.endsWith(".md")) {
            paths.push(path.join(constants_1.MEMORIES_DIR, entry));
        }
    }
    return paths;
}
function readNonEmptyLines(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    return fs
        .readFileSync(filePath, "utf-8")
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0);
}
function writeLines(filePath, lines) {
    if (lines.length === 0) {
        if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
        return;
    }
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}
function mergeMemoryFiles(sourcePath, targetPath) {
    const merged = [...readNonEmptyLines(targetPath), ...readNonEmptyLines(sourcePath)];
    writeLines(targetPath, merged);
    if (fs.existsSync(sourcePath))
        fs.unlinkSync(sourcePath);
}
function pickSourcePath(chatId, existingPaths, targetPath) {
    const candidates = existingPaths.filter((p) => p !== targetPath);
    if (candidates.length === 0)
        return null;
    const unnamedPath = path.join(constants_1.MEMORIES_DIR, `${chatId}_${constants_1.UNNAMED_CHAT_LABEL}.md`);
    const legacyPath = path.join(constants_1.MEMORIES_DIR, `${chatId}.md`);
    return (candidates.find((p) => p === unnamedPath) ??
        candidates.find((p) => p === legacyPath) ??
        candidates[0]);
}
function ensureChatMemoryPath(chatId, memoryFileName) {
    fs.mkdirSync(constants_1.MEMORIES_DIR, { recursive: true });
    const targetPath = path.join(constants_1.MEMORIES_DIR, memoryFileName);
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
function resolveChatContext(ctl) {
    try {
        const workingDirectory = ctl.getWorkingDirectory();
        const chatId = path.basename(workingDirectory);
        if (!chatId || chatId === "." || chatId === "..")
            return null;
        const chatName = readConversationName(chatId);
        const memoryFileName = buildMemoryFileName(chatId, chatName);
        const memoryFilePath = ensureChatMemoryPath(chatId, memoryFileName);
        return {
            chatId,
            chatName,
            memoryFileName,
            memoryFilePath,
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=chatContext.js.map