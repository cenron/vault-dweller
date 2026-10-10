import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { VaultDweller } from "./vault-dweller.ts";

export default function (pi: ExtensionAPI) {
  const vaultDweller = new VaultDweller(pi, {
    harnessRoot: path.resolve(fileURLToPath(new URL("..", import.meta.url))),
  });

  pi.on("session_start", (ev, ctx) => vaultDweller.startSessionEvent(ev, ctx));
  pi.on("session_shutdown", (ev, ctx) => vaultDweller.endSessionEvent(ev, ctx));
  pi.on("tool_call", (ev) => vaultDweller.toolCallEvent(ev));
  pi.on("before_agent_start", (ev) => vaultDweller.beforeAgentStartEvent(ev));
}
