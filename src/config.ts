import { createConfigSchematics } from "@lmstudio/sdk";

export const configSchematics = createConfigSchematics()
  .field(
    "autoInject",
    "select",
    {
      displayName: "Auto-Inject Memories",
      subtitle:
        "Automatically inject global and chat-specific memories into every prompt",
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
    },
    "on",
  )
  .build();
