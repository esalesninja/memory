import type { PromptPreprocessorController, ToolsProviderController } from "@lmstudio/sdk";
export type PluginController = PromptPreprocessorController | ToolsProviderController;
export interface ChatContext {
    chatId: string;
    chatName: string | null;
    memoryFileName: string;
    memoryFilePath: string;
}
export declare function buildMemoryFileName(chatId: string, chatName: string | null): string;
export declare function resolveChatContext(ctl: PluginController): ChatContext | null;
//# sourceMappingURL=chatContext.d.ts.map