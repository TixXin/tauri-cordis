import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { connectHost, createBridge, createLoader, createServiceProxy, createSlots, createWindowServices } from "tauri-cordis/client";
import type { ClientEntry, ConnectionState, HostConnection, HostTarget, PluginMessage, ServiceEventMessage } from "tauri-cordis/client";
import { installShared } from "tauri-cordis/client/react";
import type { HostInfo, PluginStatus } from "tauri-cordis/host";
import type { ServiceEntry } from "tauri-cordis/services";
import { notesV1 } from "../plugins/services.mjs";
import { createStore } from "./store";

// Everything the plugin host tells a window when it connects; after that it sends changes as events.
interface Snapshot {
  plugins: PluginStatus[];
  clients: ClientEntry[];
  services: ServiceEntry[];
  host: HostInfo;
}

const WINDOW = "main";
// Where Rust serves plugin window code (assets.rs): notes-plugin://localhost, or http://notes-plugin.localhost on Windows.
const PLUGIN_FILES = convertFileSrc("", "notes-plugin").replace(/\/$/, "");

export const hostState = createStore<ConnectionState>("connecting");
export const pluginList = createStore<PluginStatus[]>([]);

// The places in this window that plugins may fill, and how many items one plugin may put there.
export const slots = createSlots({ "main.panel/v1": { kind: "list", perPlugin: 1 } });

// Plugin window code imports React from the app; this is the copy it gets.
installShared({ react: React, jsxRuntime });

let connection: HostConnection | null = null;
const call = <T>(method: string, params?: unknown, options?: { timeoutMs?: number }) => connection?.call<T>(method, params, options) ?? Promise.reject(new Error("the plugin host is not connected"));

// Calls a plugin's own host code and hears what it publishes (`ctx.host` in window code).
const bridge = createBridge(call);
// Services by definition: a provider in this window first, else the one in the plugin host.
const proxy = createServiceProxy(call);
const services = createWindowServices({ remote: proxy });
export const notes = services.get(notesV1);

// Imports the window code of running plugins and drops it again when they stop.
const loader = createLoader({ registry: slots, bridge, base: PLUGIN_FILES });
const load = (clients: ClientEntry[]) => void loader.sync(clients.filter((entry) => entry.window === WINDOW));

connection = connectHost<Snapshot>({
  // Asked again on every reconnect: a restarted host has a new port and token.
  resolve: () => invoke<HostTarget | null>("host_connection"),
  window: WINDOW,
  onSnapshot(snapshot) {
    pluginList.set(snapshot.plugins);
    proxy.update(snapshot.services);
    load(snapshot.clients);
  },
  onEvent(name, data) {
    if (name === "plugins") pluginList.set(data as PluginStatus[]);
    if (name === "clients") load(data as ClientEntry[]);
    if (name === "services") proxy.update(data as ServiceEntry[]);
    if (name === "service") proxy.deliver(data as ServiceEventMessage);
    if (name === "plugin") bridge.deliver(data as PluginMessage);
  },
  onState(state) {
    hostState.set(state);
    // A new host knows nothing of this window's event subscriptions, so send them again.
    if (state === "open") void proxy.resubscribe();
  },
});
