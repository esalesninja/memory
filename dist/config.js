"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSchematics = void 0;
const sdk_1 = require("@lmstudio/sdk");
exports.configSchematics = (0, sdk_1.createConfigSchematics)()
    .field("autoInject", "select", {
    displayName: "Auto-Inject Memories",
    subtitle: "Automatically inject global and chat-specific memories into every prompt",
    options: [
        {
            value: "on",
            displayName: "On - inject memories into every prompt (recommended)",
        },
        {
            value: "off",
            displayName: "Off - only use memories when tools are called explicitly",
        },
    ],
}, "on")
    .build();
//# sourceMappingURL=config.js.map