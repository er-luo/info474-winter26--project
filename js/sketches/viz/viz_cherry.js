// viz_cherry.js
// Cherry Blossom Ridgeline (Mock) — stagger + month grid lines across bottom
// Template-style viz module: window.VizCherry.draw(p, manager, ai, progress)

(function () {
  // Keep config here; use manager.width/height for sizing, not fixed canvas.
  const CFG = {
    margin: { top: 90, right: 70, bottom: 110, left: 120 },

    years: [2005, 2010, 2015, 2020, 2025],

    monthTicks: [
      { m: 1, label: "Jan" },
      { m: 4, label: "Apr" },
      { m: 7, label: "Jul" },
      { m: 10, label: "Oct" },
      { m: 12, label: "Dec" },
    ],

    monthGridEvery: 1,
    monthGridAlpha: 22,
    monthGridAlphaMajor: 45,

    samplesPerYear: 260,

    zStep: 76,
    zDX: 0.95,
    zDY: -0.68,
    liftPerZ: 0.16,

    ridgeMaxAmp: 110,
    ridgeStrokeAlpha: 180,
    ridgeFillAlpha: 22,

    groundAlpha: 14,

    treesPerYear: 38,
    treeSize: 12,
    treeYOffsetMin: 10,
    treeYOffsetMax: 28,

    axisHeight: 160,
    axisTicks: 5,
  };

  window.VizCherry = {
    draw: function (p, manager, ai, progress) {
      // --- sizing from manager (matches your template) ---
      const w = manager.width || 800;
      const h = manager.height || 600;
      const ox = manager.offsetX || 0;
      const oy = manager.offsetY || 0;

      // --- cache so we don’t regenerate every frame ---
      // Regenerate if cache missing OR size changed.
      if (!manager._cherryCache || manager._cherryCache.w !== w || manager._cherryCache.h !== h) {
        manager._cherryCache = buildCache(p, w, h);
      }

      const cache = manager._cherryCache;
      const plot = cache.plot;

      // Background (only inside viz area; don’t clear whole canvas if your template overlays)
      p.push();
      p.noStroke();
      p.fill(246, 243, 238);
      p.rect(ox, oy, w, h);
      p.pop();

      // Draw everything with offset so it sits inside #vis
      p.push();
      p.translate(ox, oy);

      drawTitle(p, plot);
      draw3DFrame(p, plot);
      drawMonthGridLines(p, plot);
      drawMonthAxis(p, plot);
      draw3DHeightAxis(p, plot);
      drawRidges3D(p, plot, cache.ridges);

      p.pop();
    }
  };

  // ---------- cache builder ----------
  function buildCache(p, w, h) {
    const plot = {
      x0: CFG.margin.left,
      y0: CFG.margin.top,
      x1: w - CFG.margin.right,
      y1: h - CFG.margin.bottom,
      w: w - CFG.margin.left - CFG.margin.right,
      h: h - CFG.margin.top - CFG.margin.bottom,
    };

    const ridges = regenerateRidges(p);

    return { w, h, plot, ridges };
  }

  function regenerateRidges(p) {
    return CFG.years.map((yr, i) => {
      const t = i / (CFG.years.length - 1);

      const peakMonth = lerp(p, 4.7, 3.25, t) + p.random(-0.12, 0.12);
      const sigma = p.random(0.55, 0.95);
      const amp = CFG.ridgeMaxAmp * p.random(0.7, 1.0);

      const values = [];
      for (let j = 0; j < CFG.samplesPerYear; j++) {
        const m = map(p, j, 0, CFG.samplesPerYear - 1, 1, 12);
        const g = gaussian(m, peakMonth, sigma);
        const shoulder =
          0.28 *
          gaussian(
            m,
            peakMonth - p.random(0.8, 1.2),
            sigma * p.random(0.85, 1.2)
          );
        const wobble = 0.92 + 0.16 * p.noise(i * 13.7, j * 0.06);
        const v = amp * (g + shoulder) * wobble;
        values.push({ m, v });
      }

      // deterministic trees per year
      p.randomSeed(yr * 97 + 1337);
      const trees = buildTrees(p, values, peakMonth, CFG.treesPerYear);
      p.randomSeed();

      return { year: yr, peakMonth, sigma, amp, values, trees };
    });
  }

  // ---------- drawing ----------
  function drawTitle(p, plot) {
    p.noStroke();
    p.fill(30);
    p.textSize(22);
    p.textStyle(p.BOLD);
    p.textAlign(p.LEFT, p.BASELINE);
    p.text("Cherry Blossom Ridgelines (mock)", plot.x0, 42);

    p.textStyle(p.NORMAL);
    p.textSize(12);
    p.fill(60);
    p.text("2025 front, 2005 back. Month grid on ground for comparisons.", plot.x0, 62);
  }

  function draw3DFrame(p, plot) {
    const maxZ = (CFG.years.length - 1) * CFG.zStep;

    const FL = proj(plot.x0, plot.y1, 0);
    const FR = proj(plot.x1, plot.y1, 0);
    const BL = proj(plot.x0, plot.y1, maxZ);
    const BR = proj(plot.x1, plot.y1, maxZ);

    p.noStroke();
    p.fill(0, 0, 0, CFG.groundAlpha);
    p.beginShape();
    p.vertex(FL.x, FL.y);
    p.vertex(FR.x, FR.y);
    p.vertex(BR.x, BR.y);
    p.vertex(BL.x, BL.y);
    p.endShape(p.CLOSE);

    p.stroke(0, 0, 0, 50);
    p.strokeWeight(1);
    p.line(FL.x, FL.y, FR.x, FR.y);
    p.line(FL.x, FL.y, BL.x, BL.y);
    p.line(FR.x, FR.y, BR.x, BR.y);
    p.line(BL.x, BL.y, BR.x, BR.y);

    // year slices
    for (let i = 1; i < CFG.years.length; i++) {
      const z = i * CFG.zStep;
      const L = proj(plot.x0, plot.y1, z);
      const R = proj(plot.x1, plot.y1, z);
      p.stroke(0, 0, 0, 22);
      p.line(L.x, L.y, R.x, R.y);
    }
  }

  function drawMonthGridLines(p, plot) {
    const n = CFG.years.length;
    const maxZ = (n - 1) * CFG.zStep;

    for (let m = 1; m <= 12; m += CFG.monthGridEvery) {
      const x = monthToX(plot, m);

      const A = proj(x, plot.y1, 0);
      const B = proj(x, plot.y1, maxZ);

      const isMajor = CFG.monthTicks.some(tk => tk.m === m);
      p.stroke(0, 0, 0, isMajor ? CFG.monthGridAlphaMajor : CFG.monthGridAlpha);
      p.strokeWeight(isMajor ? 1.2 : 1);
      p.line(A.x, A.y, B.x, B.y);
    }
  }

  function drawMonthAxis(p, plot) {
    p.stroke(0, 0, 0, 70);
    p.strokeWeight(1);

    for (const tk of CFG.monthTicks) {
      const x = monthToX(plot, tk.m);
      const A = proj(x, plot.y1, 0);
      const B = proj(x, plot.y1 + 10, 0);
      p.line(A.x, A.y, B.x, B.y);

      p.noStroke();
      p.fill(0, 0, 0, 150);
      p.textSize(11);
      p.textAlign(p.CENTER, p.TOP);
      p.text(tk.label, A.x, A.y + 12);
      p.stroke(0, 0, 0, 70);
    }
  }

  function draw3DHeightAxis(p, plot) {
    const maxZ = (CFG.years.length - 1) * CFG.zStep;

    const base = proj(plot.x0, plot.y1, 0);
    const top = { x: base.x, y: base.y - CFG.axisHeight };

    p.stroke(0, 0, 0, 120);
    p.strokeWeight(2);
    p.line(base.x, base.y, top.x, top.y);

    p.strokeWeight(1);
    for (let i = 0; i <= CFG.axisTicks; i++) {
      const t = i / CFG.axisTicks;
      const y = lerpN(base.y, top.y, t);

      p.stroke(0, 0, 0, 120);
      p.line(base.x - 8, y, base.x, y);

      const guideEnd = proj(plot.x0, plot.y1 - (CFG.axisHeight * t), maxZ);
      p.stroke(0, 0, 0, 26);
      p.line(base.x, y, guideEnd.x, guideEnd.y);

      p.noStroke();
      p.fill(0, 0, 0, 140);
      p.textSize(10);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(Math.round(lerpN(0, 100, t)), base.x - 12, y);
    }

    p.noStroke();
    p.fill(0, 0, 0, 170);
    p.textSize(12);
    p.textAlign(p.LEFT, p.CENTER);
    p.text("Bloom height axis", base.x + 10, top.y + 10);
  }

  function drawRidges3D(p, plot, ridges) {
    const n = ridges.length;

    // Draw back->front (2005 back, 2025 front)
    for (let i = 0; i < n; i++) {
      const ridge = ridges[i];
      const z = (n - 1 - i) * CFG.zStep;
      const baseY = (plot.y1 - 8) - (z * CFG.liftPerZ);

      const pts = ridge.values.map(d => {
        const x = monthToX(plot, d.m);
        const y = baseY - d.v;
        return { d, p: proj(x, y, z) };
      });

      // fill
      p.noStroke();
      p.fill(0, 0, 0, CFG.ridgeFillAlpha);
      p.beginShape();
      const leftBase = proj(plot.x0, baseY, z);
      p.vertex(leftBase.x, leftBase.y);
      for (const q of pts) p.vertex(q.p.x, q.p.y);
      const rightBase = proj(plot.x1, baseY, z);
      p.vertex(rightBase.x, rightBase.y);
      p.endShape(p.CLOSE);

      // outline
      p.stroke(0, 0, 0, CFG.ridgeStrokeAlpha);
      p.strokeWeight(2.4);
      p.noFill();
      p.beginShape();
      for (const q of pts) p.vertex(q.p.x, q.p.y);
      p.endShape();

      // year label
      const yLabelPos = proj(plot.x0, baseY, z);
      p.noStroke();
      p.fill(0, 0, 0, 165);
      p.textSize(12);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(ridge.year, yLabelPos.x - 14, yLabelPos.y);

      // peak marker
      const peakX = monthToX(plot, ridge.peakMonth);
      const peakApproxY = baseY - ridge.amp * 0.92;
      const pk = proj(peakX, peakApproxY, z);
      p.stroke(0, 0, 0, 90);
      p.strokeWeight(1);
      p.line(pk.x, pk.y, pk.x, pk.y + 10);
      p.noStroke();
      p.fill(0, 0, 0, 140);
      p.circle(pk.x, pk.y, 5);

      // trees
      drawTreesForRidge(p, plot, ridge, z, baseY);
    }
  }

  // ---------- trees ----------
  function buildTrees(p, values, peakMonth, count) {
    const weights = values.map(d => Math.max(0, d.v));
    const total = weights.reduce((a, b) => a + b, 0) || 1;

    const trees = [];
    for (let k = 0; k < count; k++) {
      const pick = weightedPick(p, values, weights, total);
      const dist = Math.abs(pick.m - peakMonth);
      const bloom = clamp(mapN(dist, 0, 2.4, 1.0, 0.0), 0, 1);

      trees.push({
        m: pick.m,
        v: pick.v,
        jx: p.random(-9, 9),
        jy: p.random(CFG.treeYOffsetMin, CFG.treeYOffsetMax),
        size: CFG.treeSize * p.random(0.75, 1.25),
        bloom,
        depthFade: p.random(0.85, 1.0),
      });
    }
    return trees;
  }

  function weightedPick(p, values, weights, total) {
    let r = p.random(total);
    for (let i = 0; i < values.length; i++) {
      r -= weights[i];
      if (r <= 0) return values[i];
    }
    return values[values.length - 1];
  }

  function drawTreesForRidge(p, plot, ridge, z, baseY) {
    for (const t of ridge.trees) {
      const x = monthToX(plot, t.m) + t.jx;
      const yOnCurve = (baseY - t.v) + t.jy;
      const pp = proj(x, yOnCurve, z);
      drawBloomTree(p, pp.x, pp.y, t.size, t.bloom, t.depthFade);
    }
  }

  function drawBloomTree(p, x, y, s, bloom, fade) {
    p.push();
    p.translate(x, y);

    const trunkA = 120 * fade;
    p.stroke(35, 25, 25, trunkA);
    p.strokeWeight(Math.max(1, s * 0.12));
    p.line(0, 0, 0, -s * 0.55);

    p.strokeWeight(Math.max(1, s * 0.1));
    p.line(0, -s * 0.33, -s * 0.24, -s * 0.54);
    p.line(0, -s * 0.33,  s * 0.24, -s * 0.54);

    const petalsA = (70 + 130 * bloom) * fade;
    const outlineA = (80 + 70 * bloom) * fade;

    p.noFill();
    p.stroke(60, 40, 60, outlineA);
    p.strokeWeight(Math.max(1, s * 0.08));
    const r = s * (0.30 + 0.18 * bloom);
    scribbleLoop(p, 0, -s * 0.68, r, 14);

    p.noStroke();
    p.fill(240, 160, 195, petalsA * 0.65);
    const puffCount = Math.floor(3 + bloom * 7);
    for (let i = 0; i < puffCount; i++) {
      const ang = p.random(p.TWO_PI);
      const rr = r * p.random(0.25, 0.95);
      const px = Math.cos(ang) * rr;
      const py = -s * 0.68 + Math.sin(ang) * rr;
      const pr = s * p.random(0.16, 0.30) * (0.9 + bloom * 0.6);
      p.ellipse(px, py, pr, pr);
    }

    if (bloom > 0.65) {
      p.fill(255, 210, 230, petalsA * 0.8);
      for (let i = 0; i < 10; i++) {
        const px = p.random(-r * 0.9, r * 0.9);
        const py = p.random(-s * 0.95, -s * 0.45);
        p.circle(px, py, p.random(1.5, 2.6));
      }
    }

    p.pop();
  }

  function scribbleLoop(p, cx, cy, r, steps) {
    p.beginShape();
    for (let i = 0; i < steps; i++) {
      const ang = mapN(i, 0, steps, 0, Math.PI * 2);
      const rr = r * p.random(0.82, 1.2);
      p.vertex(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
    }
    p.endShape(p.CLOSE);
  }

  // ---------- projection / helpers ----------
  function proj(x, y, z) {
    return { x: x + z * CFG.zDX, y: y + z * CFG.zDY };
  }

  function monthToX(plot, m) {
    return mapN(m, 1, 12, plot.x0, plot.x1);
  }

  function gaussian(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(p, a, b, t) {
    return p.lerp(a, b, t);
  }

  function lerpN(a, b, t) {
    return a + (b - a) * t;
  }

  function map(p, v, a1, a2, b1, b2) {
    return p.map(v, a1, a2, b1, b2);
  }

  function mapN(v, a1, a2, b1, b2) {
    const t = (v - a1) / (a2 - a1);
    return b1 + (b2 - b1) * t;
  }
})();