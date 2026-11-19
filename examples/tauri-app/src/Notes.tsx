import { useEffect, useState, type FormEvent } from "react";
import type { Note } from "../plugins/services.mjs";
import { notes } from "./plugins";

export function Notes({ connected }: { connected: boolean }) {
  const [list, setList] = useState<Note[]>([]);

  useEffect(() => {
    if (!connected) return;
    const refresh = () => void notes.list().then(setList);
    refresh();
    const off = notes.on("added", refresh);
    return () => void off();
  }, [connected]);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("text") ?? "").trim();
    if (text) void notes.add({ text }).then(() => form.reset());
  }

  return (
    <>
      <form className="add" onSubmit={add}>
        <input name="text" placeholder="Write a note" autoComplete="off" disabled={!connected} />
        <button disabled={!connected}>Add</button>
      </form>
      <ul className="note-list">
        {list.map((note) => (
          <li key={note.id}>{note.text}</li>
        ))}
      </ul>
    </>
  );
}
