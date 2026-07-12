export declare const MEMORY_KEY_PATTERN: RegExp;
export declare const MEMORY_PERSPECTIVE_GUIDANCE: string;
export declare const MEMORY_CONTINUATION_GUIDANCE: string;
export declare const MEMORY_FORMAT_GUIDANCE: string;
export declare function getMemoryKey(content: string): string | null;
export declare function normalizeMemoryKey(key: string): string;
export declare function upsertMemoryLine(lines: string[], content: string): string[];
export declare function getChatOverrideKeys(chatLines: Array<{
    content: string;
}>): Set<string>;
export declare function annotateOverriddenGlobalLines(globalLines: Array<{
    line: number;
    content: string;
}>, chatOverrideKeys: Set<string>): string[];
//# sourceMappingURL=memoryFormat.d.ts.map