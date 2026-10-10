import type {
  BeforeAgentStartEvent,
  ExtensionAPI,
  ExtensionContext,
  SessionShutdownEvent,
  SessionStartEvent,
  ToolCallEvent,
} from "@earendil-works/pi-coding-agent";
import { Session } from "./core/session.ts";
import {Config} from "./core/config.ts";
import {registerCommands} from "./commands";
import {RadianError} from "./core/utils/errors.ts";

export interface VaultDwellerOptions {
  readonly harnessRoot: string;
}

export class VaultDweller {
  private pi: ExtensionAPI;
  private opt: VaultDwellerOptions;
  private readonly sess: Session;
  private config: Config

  constructor(pi: ExtensionAPI, opt: VaultDwellerOptions) {
    this.pi = pi;
    this.opt = opt;
    this.sess = new Session(this.opt.harnessRoot);
    this.config = new Config(this.sess);

  }
  startSessionEvent(ev: SessionStartEvent, ctx: ExtensionContext) {
    if (ctx.hasUI) ctx.ui.notify("Vault Dweller extension is loaded.", "info");

    registerCommands(this.pi)

    if (!this.config.configExist())
      if (ctx.hasUI) ctx.ui.notify("No configuration found, run /vault init", "warning");

    this.config.loadConfig();
  }

  endSessionEvent(ev: SessionShutdownEvent, ctx: ExtensionContext) {
    if (ctx.hasUI) ctx.ui.notify("Vault Dweller session ended.", "info");
  }

  toolCallEvent(ev: ToolCallEvent) {
    // TODO: Add call guardrails here
  }

  beforeAgentStartEvent(ev: BeforeAgentStartEvent) {
    // TODO: Load any system prompts here
  }
}
