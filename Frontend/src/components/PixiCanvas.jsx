import { useEffect, useRef } from "react";

// Hosts a PixiJS scene (a WebGL canvas) inside a React screen. `scene` is
// an async function (app, PIXI) => ({ update(props), destroy() }); it runs
// once, and `update` gets the latest props after every render so the scene
// can react to the game state. PixiJS loads only on screens that use it.
function PixiCanvas({ scene, props, className = "", label }) {
  const host = useRef(null);
  const api = useRef(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    let destroyed = false;
    let app = null;
    (async () => {
      const PIXI = await import("pixi.js");
      app = new PIXI.Application();
      await app.init({ resizeTo: host.current, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }
      host.current.appendChild(app.canvas);
      api.current = await scene(app, PIXI);
      api.current?.update?.(latest.current);
    })().catch((e) => console.error("Scene:", e));
    return () => {
      destroyed = true;
      api.current?.destroy?.();
      api.current = null;
      if (app?.renderer) app.destroy(true, { children: true });
    };
  }, [scene]);

  useEffect(() => {
    api.current?.update?.(props);
  });

  return <div ref={host} className={`relative w-full h-full ${className}`} role="img" aria-label={label} />;
}

export default PixiCanvas;
