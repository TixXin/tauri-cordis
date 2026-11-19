import { defineService } from "tauri-cordis/services";

export const name = "word-count";
// Start once someone provides notes/v1, and stop when it goes away.
export const inject = ["clients", "notes/v1"];

// A third-party plugin states the part of the service it uses; the name ties it to the provider.
const notesV1 = defineService("notes/v1", { methods: { list: true }, events: { added: true } });

const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;

async function count(notes) {
  const all = await notes.list();
  return { notes: all.length, words: all.reduce((sum, note) => sum + words(note.text), 0) };
}

export async function apply(ctx) {
  const notes = ctx.services.get(notesV1);
  let summary = await count(notes);
  // `ctx.clients` talks to this plugin's window code: answer its calls, publish to it.
  ctx.clients.handle("summary", () => summary);
  notes.on("added", async () => {
    summary = await count(notes);
    ctx.clients.publish("updated", summary);
  });
}
