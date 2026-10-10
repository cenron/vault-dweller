import type {ExtensionCommandContext, ExtensionContext} from "@earendil-works/pi-coding-agent";
import type {CommandDefinition} from "./types.ts";

export function VaultCmd(): CommandDefinition {
    return {
        name: "vault",
        description: "Vault command, has init",
        action: async (args: string[], ctx: ExtensionCommandContext) => {
            ctx.ui.notify("Vault command");
            return "";
        },
    };
}