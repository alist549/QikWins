import { useEffect, useRef, useState } from "react";
import Die from "./Dice";

// Real 3D dice for 7x, by dice-box-threejs (MIT, github.com/3d-dice):
// three.js dice with physics that tumble across the table and land on the
// numbers the server rolled. It loads only on this screen. Until it is
// ready (or if WebGL is missing) the flat dice show instead.
function Dice3D({ dice, rollKey, label }) {
  const host = useRef(null);
  const box = useRef(null);
  const id = useRef(`dice-${Math.random().toString(36).slice(2)}`);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const rolled = useRef(null);

  useEffect(() => {
    let gone = false;
    (async () => {
      const { default: DiceBox } = await import("@3d-dice/dice-box-threejs");
      const b = new DiceBox(`#${id.current}`, {
        sounds: false,
        shadows: true,
        theme_surface: "green-felt",
        theme_colorset: "white",
        theme_material: "plastic",
        baseScale: 90,
        strength: 1,
        light_intensity: 0.9,
      });
      await b.initialize();
      if (gone) return;
      box.current = b;
      setReady(true);
    })().catch((e) => {
      console.error("Dice:", e);
      setFailed(true);
    });
    return () => {
      gone = true;
      box.current?.clearDice?.();
      host.current?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (!ready || !dice?.length || rolled.current === rollKey) return;
    rolled.current = rollKey;
    box.current.roll(`${dice.length}d6@${dice.join(",")}`).catch(() => {});
  }, [ready, dice, rollKey]);

  return (
    <div className="relative w-full h-44 lg:h-56 rounded-[24px] overflow-hidden bg-[#14532D]" role="img" aria-label={label}>
      <div id={id.current} ref={host} className={`absolute inset-0 ${ready ? "" : "opacity-0"}`} />
      {(!ready || failed) && (
        <div className="absolute inset-0 flex items-center justify-center gap-3">
          {dice.map((n, i) => (
            <Die key={i} n={n} size={64} delay={i * 0.08} rollKey={`${rollKey}-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dice3D;
