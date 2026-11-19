import { notesV1 } from "../../services.mjs";

export const name = "notes";

// A built-in plugin ships with the app, so it may call the app's Rust side (`ctx.rust`).
// This one turns Rust's storage into the `notes/v1` service that the window and other plugins use.
export function apply(ctx) {
  const provider = ctx.services.provide(notesV1, {
    list: () => ctx.rust.call("storage.read"),
    add: async (params) => {
      const note = await ctx.rust.call("storage.write", { text: params?.text });
      provider.emit("added", note);
      return note;
    },
  });
}
