import type {ExtensionCommandContext} from "@earendil-works/pi-coding-agent";

export type Action = (args: string[], ctx: ExtensionCommandContext) => string | undefined | Promise<string | undefined>

export interface CommandDefinition {
    name: string;
    description: string;
    action: Action;
}
