"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptPreprocessor = promptPreprocessor;
const sdk_1 = require("@lmstudio/sdk");
const config_1 = require("./config");
const constants_1 = require("./constants");
const chatContext_1 = require("./chatContext");
const memoryFormat_1 = require("./memoryFormat");
const memoryStore_1 = require("./memoryStore");
const stateMap = new Map();
function extractText(message) {
    return message.getText();
}
function injectIntoMessage(message, injection) {
    const cloned = sdk_1.ChatMessage.from(message);
    cloned.replaceText(`${injection}\n\n---\n\n${cloned.getText()}`);
    return cloned;
}
function parseRememberRequest(text) {
    if (constants_1.REMEMBER_CHAT_REGEX.test(text)) {
        const memoryText = text.replace(constants_1.REMEMBER_CHAT_REGEX, "").trim();
        return memoryText ? { kind: "auto", scope: "chat", memoryText } : null;
    }
    if (constants_1.REMEMBER_GLOBAL_REGEX.test(text)) {
        const memoryText = text.replace(constants_1.REMEMBER_GLOBAL_REGEX, "").trim();
        return memoryText ? { kind: "auto", scope: "global", memoryText } : null;
    }
    if (constants_1.REMEMBER_PREFIX_REGEX.test(text)) {
        const memoryText = text.replace(constants_1.REMEMBER_PREFIX_REGEX, "").trim();
        return memoryText ? { kind: "choose", memoryText } : null;
    }
    return null;
}
function buildRememberChooseNote(memoryText) {
    return [
        "[memory-plugin] The user wants to remember the following:",
        `"${memoryText}"`,
        "",
        memoryFormat_1.MEMORY_FORMAT_GUIDANCE,
        "",
        "Decide the scope and save it with the appropriate tool:",
        "- write_memory_global — user identity and preferences, standing facts about the person, anything for all future conversations",
        "- write_memory — project/task/thread-specific context for this conversation only",
        "",
        "Examples: `User name: Yusuf` → global; `AI Name: Güzel` → global; \"we're using PostgreSQL in this project\" → chat as `Project database: PostgreSQL`.",
        "If scope is genuinely unclear, ask once whether it should be global or chat-only, then save.",
    ].join("\n");
}
function buildRememberSavedNote(scope, fileName, content) {
    const target = scope === "global" ? "global.md" : fileName;
    return [
        "[memory-plugin] The following was automatically saved to " + target + ":",
        `"${content}"`,
        "",
        "Memory storage is already complete. Do not call write_memory tools for this.",
    ].join("\n");
}
function stripRememberPrefix(message, memoryText) {
    const cloned = sdk_1.ChatMessage.from(message);
    cloned.replaceText(memoryText);
    return cloned;
}
function formatGlobalMemoryBlock(globalMemory, chatLines) {
    if (globalMemory.lines.length === 0)
        return "";
    const chatOverrideKeys = (0, memoryFormat_1.getChatOverrideKeys)(chatLines);
    const numbered = (0, memoryFormat_1.annotateOverriddenGlobalLines)(globalMemory.lines, chatOverrideKeys).join("\n");
    return `<global_memories file="${globalMemory.fileName}">\n${numbered}\n</global_memories>`;
}
function buildAutoInjectBlock(globalBlock, chatBlock, chatId, chatName) {
    const parts = [
        "You have access to persistent memories stored as line-based markdown files in ~/.lmstudio/memories/.",
        "Global memories apply to every conversation. Chat memories apply only to this conversation.",
        "",
        memoryFormat_1.MEMORY_FORMAT_GUIDANCE,
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
function computeFingerprint(globalRaw, chatRaw, chatFileName) {
    return `${chatFileName}|${globalRaw}|${chatRaw}`;
}
async function promptPreprocessor(ctl, userMessage) {
    try {
        const text = extractText(userMessage);
        if (text.trim().length < constants_1.MIN_PROMPT_LENGTH)
            return userMessage;
        const config = ctl.getPluginConfig(config_1.configSchematics);
        const autoInject = config.get("autoInject") === "on";
        const rememberRequest = parseRememberRequest(text);
        if (rememberRequest) {
            if (rememberRequest.kind === "choose") {
                const stripped = stripRememberPrefix(userMessage, rememberRequest.memoryText);
                return injectIntoMessage(stripped, buildRememberChooseNote(rememberRequest.memoryText));
            }
            const { scope, memoryText } = rememberRequest;
            const chat = (0, chatContext_1.resolveChatContext)(ctl);
            if (scope === "chat") {
                if (!chat)
                    return userMessage;
                (0, memoryStore_1.writeChatMemory)(chat, memoryText);
            }
            else {
                (0, memoryStore_1.writeGlobalMemory)(memoryText);
            }
            const fileName = scope === "global" ? "global.md" : chat.memoryFileName;
            const updatedGlobal = (0, memoryStore_1.readGlobalMemory)();
            const updatedChat = chat ? (0, memoryStore_1.readChatMemory)(chat) : null;
            stateMap.set(ctl, {
                fingerprint: computeFingerprint(updatedGlobal.raw, updatedChat?.raw ?? "", chat?.memoryFileName ?? "none"),
                injectedAt: Date.now(),
            });
            const stripped = stripRememberPrefix(userMessage, memoryText);
            return injectIntoMessage(stripped, buildRememberSavedNote(scope, fileName, memoryText));
        }
        if (!autoInject)
            return userMessage;
        const chat = (0, chatContext_1.resolveChatContext)(ctl);
        const globalMemory = (0, memoryStore_1.readGlobalMemory)();
        const chatMemory = chat ? (0, memoryStore_1.readChatMemory)(chat) : null;
        const fingerprint = computeFingerprint(globalMemory.raw, chatMemory?.raw ?? "", chat?.memoryFileName ?? "none");
        const now = Date.now();
        const state = stateMap.get(ctl) ?? { fingerprint: "", injectedAt: 0 };
        const memoriesChanged = fingerprint !== state.fingerprint;
        const intervalElapsed = now - state.injectedAt > constants_1.REINJECT_INTERVAL_MS;
        const hasMemories = globalMemory.lines.length > 0 || (chatMemory?.lines.length ?? 0) > 0;
        const shouldSkip = hasMemories
            ? !memoriesChanged && !intervalElapsed
            : state.injectedAt !== 0 && !intervalElapsed;
        if (shouldSkip)
            return userMessage;
        stateMap.set(ctl, { fingerprint, injectedAt: now });
        const globalBlock = formatGlobalMemoryBlock(globalMemory, chatMemory?.lines ?? []);
        const chatBlock = chatMemory
            ? (0, memoryStore_1.formatMemoryBlock)("chat_memories", chatMemory)
            : "";
        return injectIntoMessage(userMessage, buildAutoInjectBlock(globalBlock, chatBlock, chat?.chatId ?? null, chat?.chatName ?? null));
    }
    catch (err) {
        console.warn("memory preprocessor error:", err);
        return userMessage;
    }
}
//# sourceMappingURL=preprocessor.js.map