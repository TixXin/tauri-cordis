import type { ServiceDefinition } from "tauri-cordis/services";

export type Note = { id: number; text: string };

export declare const notesV1: ServiceDefinition<{ list(): Note[]; add(params: { text: string }): Note }, { added: Note }>;
