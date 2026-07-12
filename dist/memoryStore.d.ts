import type { ChatContext } from "./chatContext";
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
export declare function getGlobalMemoryPath(): string;
export declare function readGlobalMemory(): MemoryFileContents;
export declare function readChatMemory(chat: ChatContext): MemoryFileContents;
export declare function writeGlobalMemory(content: string): MemoryFileContents;
export declare function writeChatMemory(chat: ChatContext, content: string): MemoryFileContents;
export declare function removeGlobalMemoryLine(line: number): MemoryFileContents;
export declare function removeChatMemoryLine(chat: ChatContext, line: number): MemoryFileContents;
export declare function formatMemoryBlock(label: string, contents: MemoryFileContents): string;
//# sourceMappingURL=memoryStore.d.ts.map