import { useEffect, useState } from "react";
import "./island.css";

export default function apply(ctx: any) {
  function Hello() {
    const [count, setCount] = useState<number | null>(null);
    const [greeting, setGreeting] = useState("");
    useEffect(() => {
      const off = ctx.host.on("tick", setCount);
      ctx.host.call("greet", { who: "island" }).then(setGreeting, (error: Error) => setGreeting(String(error.message)));
      return () => {
        void off();
      };
    }, []);
    return (
      <div className="cordis-hello" data-plugin="hello">
        <span className="cordis-hello__greeting">{greeting || "…"}</span>
        <span className="cordis-hello__count">{count === null ? "" : `#${count}`}</span>
      </div>
    );
  }
  ctx.slots.add("island.dev/v1", { id: "hello", component: Hello });
}
