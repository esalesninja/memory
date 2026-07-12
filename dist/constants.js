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
exports.REMEMBER_PREFIX_REGEX = exports.REMEMBER_CHAT_REGEX = exports.REMEMBER_GLOBAL_REGEX = exports.REINJECT_INTERVAL_MS = exports.MIN_PROMPT_LENGTH = exports.UNNAMED_CHAT_LABEL = exports.GLOBAL_MEMORY_FILE = exports.CONVERSATIONS_DIR = exports.MEMORIES_DIR = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.MEMORIES_DIR = path.join(os.homedir(), ".lmstudio", "memories");
exports.CONVERSATIONS_DIR = path.join(os.homedir(), ".lmstudio", "conversations");
exports.GLOBAL_MEMORY_FILE = "global.md";
exports.UNNAMED_CHAT_LABEL = "unnamed";
exports.MIN_PROMPT_LENGTH = 1;
exports.REINJECT_INTERVAL_MS = 15 * 60 * 1_000;
exports.REMEMBER_GLOBAL_REGEX = /^remember\s+global:\s*/i;
exports.REMEMBER_CHAT_REGEX = /^remember\s+chat:\s*/i;
exports.REMEMBER_PREFIX_REGEX = /^remember:\s*/i;
//# sourceMappingURL=constants.js.map