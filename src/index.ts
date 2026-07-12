import { type PluginContext } from "@lmstudio/sdk";
import { configSchematics } from "./config";
import { promptPreprocessor } from "./preprocessor";
import { toolsProvider } from "./toolsProvider";
import { MEMORIES_DIR } from "./constants";
import * as fs from "fs";

function bootstrapMemoriesDir(): void {
  fs.mkdirSync(MEMORIES_DIR, { recursive: true });
}

export async function main(context: PluginContext) {
  bootstrapMemoriesDir();
  context.withConfigSchematics(configSchematics);
  context.withToolsProvider(toolsProvider);
  context.withPromptPreprocessor(promptPreprocessor);
}
