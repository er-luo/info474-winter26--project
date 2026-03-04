// js/helpers/mount_bottom_vizes.js
// Mount Scatter + Bar + Cherry as always-visible canvases at the bottom.

(function () {
  function makeManager() {
    return {
      margin: { left: 20, top: 20, right: 20, bottom: 20 },
      offsetX: 20,
      offsetY: 20,
      data: []
    };
  }

  function mountOne({ mountId, vizObjName, ai }) {
    const mountEl = document.getElementById(mountId);
    if (!mountEl) return;

    const Viz = window[vizObjName];
    if (!Viz || typeof Viz.draw !== "function") {
      console.warn(`Missing ${vizObjName}.draw(...) for`, mountId);
      return;
    }

    const manager = makeManager();

    // Optional: if your viz has setData(manager) defined, call it once
    if (typeof Viz.setData === "function") {
      try { Viz.setData(manager); } catch (e) { console.warn(e); }
    }

    new p5((p) => {
      function resizeToContainer() {
        const w = Math.max(300, mountEl.clientWidth || 600);
        const h = 420; // tweak if you want taller/shorter
        p.resizeCanvas(w, h);
      }

      p.setup = () => {
        const w = Math.max(300, mountEl.clientWidth || 600);
        p.createCanvas(w, 420).parent(mountEl);
        p.pixelDensity(1);
      };

      p.draw = () => {
        // progress can just be 0 if you’re not using scroll transitions
        const progress = 0;
        Viz.draw(p, manager, ai, progress);
      };

      p.windowResized = () => resizeToContainer();
    });
  }

  window.addEventListener("load", () => {
    // Use the AI indices your renderer uses:
    // scatter: 4..6, bar: 7, cherry: 8 (based on your HTML section)
    mountOne({ mountId: "viz-scatter-mount", vizObjName: "VizScatter", ai: 4 });
    mountOne({ mountId: "viz-bar-mount", vizObjName: "VizBar", ai: 7 });
    mountOne({ mountId: "viz-cherry-mount", vizObjName: "VizCherry", ai: 8 });
  });
})();