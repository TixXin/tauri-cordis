import { defineService } from "tauri-cordis/services";

// A service is a versioned name with the methods and events it has. The plugin that provides it
// and everyone who uses it (the window, other plugins) agree on this and on nothing else.
export const notesV1 = defineService("notes/v1", {
  methods: { list: true, add: true },
  events: { added: true },
});
