import type {ExtensionAPI, ExtensionCommandContext, ExtensionContext} from "@earendil-works/pi-coding-agent";
import {VaultCmd} from "./vault.ts";
import type {Action, CommandDefinition} from "./types.ts";
import {errorMessage} from "../core/utils/errors.ts";

export const registerCommands = (pi: ExtensionAPI) => {
    for (const command of createCommand()) {
        pi.registerCommand(command.name,
            {
                description: command.description,
                handler: (args: string, ctx: ExtensionCommandContext): Promise<void> => runCommand(ctx, command.action, args)
            });
    }
}

const createCommand = (): CommandDefinition[] => {
    return [VaultCmd()]
}

async function runCommand(
    ctx: ExtensionCommandContext,
    action: Action,
    args: string
): Promise<void> {
    try {
        const message = await action(splitArguments(args), ctx);
        if (message) ctx.ui.notify(message, "info");
    } catch (error) {
        ctx.ui.notify(errorMessage(error), "error");
    }
}

function splitArguments(args: string): string[] {
    return args.trim().split(/\s+/).filter(Boolean);
}