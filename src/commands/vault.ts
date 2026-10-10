import type {ExtensionCommandContext} from "@earendil-works/pi-coding-agent";
import type {CommandDefinition} from "./types.ts";

export function VaultCmd(): CommandDefinition {
    return {
        name: "vault",
        description: "Vault command, has init",
        action: async (args: string[], ctx: ExtensionCommandContext) => {
            const [subcommand = "", ...remainingArgs] = args;

            switch(subcommand) {
                case "init":
                    initVault(ctx, remainingArgs);
                    break;
            }

            return "";
        },
    };
}

const initVault = (ctx: ExtensionCommandContext, args: string[]) => {
    ctx.ui.notify("Init vault" + args.join(" "));
};