(function () {
  const CFG = {
    csvPath: "data/Maust_et_al_data/blossom_dates.csv",

    margin: { top: 0, right: 250, bottom: 0, left: 0 },

    years: [],

    monthMin: 2,
    monthMax: 6,

    monthTicks: [
      { m: 2, label: "Feb" },
      { m: 3, label: "Mar" },
      { m: 4, label: "Apr" },
      { m: 5, label: "May" },
      { m: 6, label: "Jun" },
    ],

    monthGridEvery: 1,
    monthGridAlpha: 18,
    monthGridAlphaMajor: 42,

    samplesPerYear: 260,

    // stronger consistent 3D stagger of the whole plane
    zStep: 86,
    zDX: 1.35,
    zDY: -0.78,
    liftPerZ: 0,

    ridgeMaxAmp: 110,
    ridgeStrokeAlpha: 180,
    ridgeFillAlpha: 20,

    groundAlpha: 12,

    treesPerYear: 24,
    treeSize: 12,
    treeYOffsetMin: 10,
    treeYOffsetMax: 28,

    axisHeight: 160,
    axisTicks: 5,

    bloomSigma: 0.22,
    targetRidgeCount: 5,

    // removed fake month shifting
    staggerMonthOffset: 0,
  };

  window.VizCherry = {
    draw: function (p, manager, ai, progress) {
      const w = manager.width || 800;
      const h = manager.height || 600;
      const ox = manager.offsetX || 0;
      const oy = manager.offsetY || 0;

      ensureDataLoaded(p, manager);

      p.push();
      p.noStroke();
      p.fill(246, 243, 238);
      p.rect(ox, oy, w, h);
      p.pop();

      p.push();
      p.translate(ox, oy);

      if (manager._cherryLoadError) {
        const plot = makePlot(w, h);
        drawTitle(p, plot);
        p.noStroke();
        p.fill(80);
        p.textSize(14);
        p.textAlign(p.LEFT, p.TOP);
        p.text("Could not load cherry blossom CSV.", plot.x0, 86);
        p.pop();
        return;
      }

      if (!manager._cherryDataLoaded) {
        const plot = makePlot(w, h);
        drawTitle(p, plot);
        p.noStroke();
        p.fill(80);
        p.textSize(14);
        p.textAlign(p.LEFT, p.TOP);
        p.text("Loading cherry blossom data...", plot.x0, 86);
        p.pop();
        return;
      }

      if (
        !manager._cherryCache ||
        manager._cherryCache.w !== w ||
        manager._cherryCache.h !== h
      ) {
        manager._cherryCache = buildCache(p, w, h, manager._cherryRows || []);
      }

      const cache = manager._cherryCache;
      const plot = cache.plot;

      drawTitle(p, plot);
      draw3DFrame(p, plot, cache.ridges.length, cache.zStep);
      drawMonthGridLines(p, plot, cache.ridges.length, cache.zStep);
      drawMonthAxis(p, plot, cache.ridges.length, cache.zStep);
      draw3DHeightAxis(p, plot, cache.ridges.length, cache.zStep);
      drawRidges3D(p, plot, cache.ridges, cache.zStep);

      p.pop();
    }
  };

  function ensureDataLoaded(p, manager) {
    if (
      manager._cherryDataLoaded ||
      manager._cherryDataLoading ||
      manager._cherryLoadError
    ) {
      return;
    }

    manager._cherryDataLoading = true;

    p.loadTable(
      CFG.csvPath,
      "csv",
      "header",
      (table) => {
        const rows = table.getRows()
          .map((row) => ({
            YEAR: Number(row.get("YEAR")),
            PLANT: row.get("PLANT"),
            BLOOMDAY: Number(row.get("BLOOMDAY")),
            METHOD: row.get("METHOD"),
          }))
          .filter(
            (d) =>
              Number.isFinite(d.YEAR) &&
              Number.isFinite(d.BLOOMDAY) &&
              d.BLOOMDAY > 0
          )
          .sort((a, b) => a.YEAR - b.YEAR);

        manager._cherryRows = rows;
        CFG.years = rows.map((d) => d.YEAR);

        manager._cherryDataLoaded = true;
        manager._cherryDataLoading = false;
      },
      (err) => {
        console.error("Cherry CSV load failed:", err);
        manager._cherryLoadError = true;
        manager._cherryDataLoading = false;
      }
    );
  }

  function buildCache(p, w, h, rows) {
    const plot = makePlot(w, h);
    const ridges = regenerateRidgesFromData(rows);
    const zStep = getDynamicZStep(ridges.length, plot);
    return { w, h, plot, ridges, zStep };
  }

  function makePlot(w, h) {
    return {
      x0: CFG.margin.left,
      y0: CFG.margin.top,
      x1: w - CFG.margin.right,
      y1: h - CFG.margin.bottom,
      w: w - CFG.margin.left - CFG.margin.right,
      h: h - CFG.margin.top - CFG.margin.bottom,
    };
  }

  function getDynamicZStep(ridgeCount, plot) {
    if (ridgeCount <= 1) return CFG.zStep;

    const maxDepthByWidth = plot.w * 0.32;
    const maxDepthByHeight = plot.h * 0.25;
    const maxDepth = Math.min(maxDepthByWidth, maxDepthByHeight, 250);

    return maxDepth / (ridgeCount - 1);
  }

  function regenerateRidgesFromData(rows) {
    const groupedRows = bucketRowsIntoTargetCount(rows, CFG.targetRidgeCount);

    return groupedRows.map((group) => {
      const avgBloomDay =
        group.rows.reduce((sum, d) => sum + d.BLOOMDAY, 0) / group.rows.length;

      const peakMonth = clamp(
        dayOfYearToMonthFloat(avgBloomDay),
        CFG.monthMin + 0.05,
        CFG.monthMax - 0.05
      );

      const amp = CFG.ridgeMaxAmp;
      const sigma = CFG.bloomSigma;

      const values = [];
      for (let j = 0; j < CFG.samplesPerYear; j++) {
        const m = mapN(j, 0, CFG.samplesPerYear - 1, CFG.monthMin, CFG.monthMax);
        const v = amp * gaussian(m, peakMonth, sigma);
        values.push({ m, v });
      }

      const trees = buildStaticTrees(values, peakMonth, CFG.treesPerYear, group.startYear);

      return {
        year: group.label,
        peakMonth,
        rawPeakMonth: peakMonth,
        sigma,
        amp,
        bloomDay: avgBloomDay,
        method: "Averaged group",
        plant: group.rows[0]?.PLANT || "",
        values,
        trees,
        startYear: group.startYear,
        endYear: group.endYear,
        count: group.rows.length,
      };
    });
  }

  function bucketRowsIntoTargetCount(rows, targetCount) {
    const sorted = [...rows].sort((a, b) => a.YEAR - b.YEAR);

    if (!sorted.length) return [];

    if (sorted.length <= targetCount) {
      return sorted.map((row) => ({
        startYear: row.YEAR,
        endYear: row.YEAR,
        label: String(row.YEAR),
        rows: [row],
      }));
    }

    const buckets = [];

    for (let i = 0; i < targetCount; i++) {
      const startIdx = Math.floor((i * sorted.length) / targetCount);
      const endIdx = Math.floor(((i + 1) * sorted.length) / targetCount);
      const chunk = sorted.slice(startIdx, endIdx);

      if (!chunk.length) continue;

      const startYear = chunk[0].YEAR;
      const endYear = chunk[chunk.length - 1].YEAR;

      buckets.push({
        startYear,
        endYear,
        label: startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`,
        rows: chunk,
      });
    }

    return buckets;
  }

  function drawTitle(p, plot) {
    p.noStroke();
    p.fill(30);
    p.textSize(22);
    p.textStyle(p.BOLD);
    p.textAlign(p.LEFT, p.BASELINE);
    p.text("Cherry Blossom Ridgelines", plot.x0, 42);

    p.textStyle(p.NORMAL);
    p.textSize(12);
    p.fill(60);
    p.text("Real bloom-day data, shown on consistently staggered ridge planes.", plot.x0, 62);
  }

  function draw3DFrame(p, plot, ridgeCount, zStep) {
    const maxZ = Math.max(0, (ridgeCount - 1) * zStep);

    const frontY = plot.y1;
    const backY = plot.y1 - maxZ * CFG.liftPerZ;

    const FL = proj(plot.x0, frontY, 0);
    const FR = proj(plot.x1, frontY, 0);
    const BL = proj(plot.x0, backY, maxZ);
    const BR = proj(plot.x1, backY, maxZ);

    p.noStroke();
    p.fill(0, 0, 0, CFG.groundAlpha);
    p.beginShape();
    p.vertex(FL.x, FL.y);
    p.vertex(FR.x, FR.y);
    p.vertex(BR.x, BR.y);
    p.vertex(BL.x, BL.y);
    p.endShape(p.CLOSE);

    p.stroke(0, 0, 0, 48);
    p.strokeWeight(1);
    p.line(FL.x, FL.y, FR.x, FR.y);
    p.line(FL.x, FL.y, BL.x, BL.y);
    p.line(FR.x, FR.y, BR.x, BR.y);
    p.line(BL.x, BL.y, BR.x, BR.y);

    for (let i = 1; i < ridgeCount; i++) {
      const z = i * zStep;
      const yBase = plot.y1 - z * CFG.liftPerZ;
      const L = proj(plot.x0, yBase, z);
      const R = proj(plot.x1, yBase, z);
      p.stroke(0, 0, 0, 18);
      p.line(L.x, L.y, R.x, R.y);
    }
  }

  function drawMonthGridLines(p, plot, ridgeCount, zStep) {
    const maxZ = Math.max(0, (ridgeCount - 1) * zStep);

    for (let m = CFG.monthMin; m <= CFG.monthMax; m += CFG.monthGridEvery) {
      const x = monthToX(plot, m);

      const A = proj(x, plot.y1, 0);
      const B = proj(x, plot.y1 - maxZ * CFG.liftPerZ, maxZ);

      const isMajor = CFG.monthTicks.some((tk) => tk.m === m);
      p.stroke(0, 0, 0, isMajor ? CFG.monthGridAlphaMajor : CFG.monthGridAlpha);
      p.strokeWeight(isMajor ? 1.15 : 1);
      p.line(A.x, A.y, B.x, B.y);
    }
  }

  function drawMonthAxis(p, plot, ridgeCount, zStep) {
    const backZ = Math.max(0, (ridgeCount - 1) * zStep);

    // draw front and back month axis so the whole staggered plane reads clearly
    drawMonthAxisAtZ(p, plot, 0, true);
    if (backZ > 0) drawMonthAxisAtZ(p, plot, backZ, false);
  }

  function drawMonthAxisAtZ(p, plot, z, showLabels) {
    const yBase = plot.y1 - z * CFG.liftPerZ;

    const left = proj(plot.x0, yBase, z);
    const right = proj(plot.x1, yBase, z);

    p.stroke(0, 0, 0, z === 0 ? 75 : 40);
    p.strokeWeight(1);
    p.line(left.x, left.y, right.x, right.y);

    for (const tk of CFG.monthTicks) {
      const x = monthToX(plot, tk.m);
      const A = proj(x, yBase, z);
      const B = proj(x, yBase + 9, z);

      p.stroke(0, 0, 0, z === 0 ? 75 : 36);
      p.line(A.x, A.y, B.x, B.y);

      if (showLabels) {
        p.noStroke();
        p.fill(0, 0, 0, 155);
        p.textSize(11);
        p.textAlign(p.CENTER, p.TOP);
        p.text(tk.label, B.x, B.y + 4);
      }
    }
  }

  function draw3DHeightAxis(p, plot, ridgeCount, zStep) {
    const maxZ = Math.max(0, (ridgeCount - 1) * zStep);

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
      p.stroke(0, 0, 0, 24);
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

  function drawRidges3D(p, plot, ridges, zStep) {
    const n = ridges.length;

    for (let i = 0; i < n; i++) {
      const ridge = ridges[i];
      const z = (n - 1 - i) * zStep;
      const baseY = (plot.y1 - 3) - (z * CFG.liftPerZ);

      const pts = ridge.values.map((d) => {
        const x = monthToX(plot, d.m);
        const y = baseY - d.v;
        return { d, p: proj(x, y, z) };
      });

      const localL = proj(plot.x0, baseY, z);
      const localR = proj(plot.x1, baseY, z);
      p.stroke(0, 0, 0, 26);
      p.strokeWeight(1);
      p.line(localL.x, localL.y, localR.x, localR.y);

      p.noStroke();
      p.fill(0, 0, 0, CFG.ridgeFillAlpha);
      p.beginShape();
      p.vertex(localL.x, localL.y);
      for (const q of pts) p.vertex(q.p.x, q.p.y);
      p.vertex(localR.x, localR.y);
      p.endShape(p.CLOSE);

      p.stroke(0, 0, 0, CFG.ridgeStrokeAlpha);
      p.strokeWeight(2.4);
      p.noFill();
      p.beginShape();
      for (const q of pts) p.vertex(q.p.x, q.p.y);
      p.endShape();

      const yLabelPos = proj(plot.x1, baseY, z);
      p.noStroke();
      p.fill(0, 0, 0, 165);
      p.textSize(12);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(ridge.year, yLabelPos.x + 14, yLabelPos.y);

      const peakX = monthToX(plot, ridge.peakMonth);
      const peakApproxY = baseY - ridge.amp * 0.92;
      const pk = proj(peakX, peakApproxY, z);

      p.stroke(0, 0, 0, 82);
      p.strokeWeight(1);
      p.line(pk.x, pk.y, pk.x, pk.y + 10);

      p.noStroke();
      p.fill(0, 0, 0, 140);
      p.circle(pk.x, pk.y, 5);

      // average bloom day label
      p.fill(0, 0, 0, 165);
      p.textSize(11);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text("Day: " + Math.round(ridge.bloomDay), pk.x-10, pk.y - 10);
      drawTreesForRidge(p, plot, ridge, z, baseY);
    }
  }

  function buildStaticTrees(values, peakMonth, count, seed) {
    if (!count) return [];

    const rng = mulberry32(seed * 9973 + 17);

    const weights = values.map((d) => Math.max(0, d.v));
    const total = weights.reduce((a, b) => a + b, 0) || 1;

    const trees = [];
    for (let k = 0; k < count; k++) {
      const pick = weightedPickStatic(values, weights, total, rng);
      const dist = Math.abs(pick.m - peakMonth);
      const bloom = clamp(mapN(dist, 0, 2.4, 1.0, 0.0), 0, 1);

      trees.push({
        m: pick.m,
        v: pick.v,
        jx: lerpN(-9, 9, rng()),
        jy: lerpN(CFG.treeYOffsetMin, CFG.treeYOffsetMax, rng()),
        size: CFG.treeSize * lerpN(0.75, 1.25, rng()),
        bloom,
        depthFade: lerpN(0.85, 1.0, rng()),
      });
    }

    return trees;
  }

  function weightedPickStatic(values, weights, total, rng) {
    let r = rng() * total;
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
    p.line(0, -s * 0.33, s * 0.24, -s * 0.54);

    const petalsA = (70 + 130 * bloom) * fade;
    const outlineA = (80 + 70 * bloom) * fade;

    p.noFill();
    p.stroke(60, 40, 60, outlineA);
    p.strokeWeight(Math.max(1, s * 0.08));
    const r = s * (0.30 + 0.18 * bloom);
    scribbleLoopStatic(p, 0, -s * 0.68, r, 14, bloom);

    p.noStroke();
    p.fill(240, 160, 195, petalsA * 0.65);
    const puffCount = Math.floor(3 + bloom * 7);
    for (let i = 0; i < puffCount; i++) {
      const ang = (i / Math.max(1, puffCount)) * Math.PI * 2;
      const rr = r * (0.35 + 0.55 * ((i % 3) / 2));
      const px = Math.cos(ang) * rr;
      const py = -s * 0.68 + Math.sin(ang) * rr;
      const pr = s * (0.16 + 0.03 * (i % 4)) * (0.9 + bloom * 0.6);
      p.ellipse(px, py, pr, pr);
    }

    if (bloom > 0.65) {
      p.fill(255, 210, 230, petalsA * 0.8);
      for (let i = 0; i < 10; i++) {
        const px = lerpN(-r * 0.9, r * 0.9, i / 9);
        const py = lerpN(-s * 0.95, -s * 0.45, (i % 5) / 4);
        p.circle(px, py, 1.8 + (i % 3) * 0.3);
      }
    }

    p.pop();
  }

  function scribbleLoopStatic(p, cx, cy, r, steps, seedish) {
    p.beginShape();
    for (let i = 0; i < steps; i++) {
      const ang = mapN(i, 0, steps, 0, Math.PI * 2);
      const wobble = 0.9 + 0.18 * Math.sin(i * 2.3 + seedish * 3.1);
      const rr = r * wobble;
      p.vertex(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
    }
    p.endShape(p.CLOSE);
  }

  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function proj(x, y, z) {
    return {
      x: x + z * CFG.zDX,
      y: y + z * CFG.zDY
    };
  }

  function monthToX(plot, m) {
    return mapN(m, CFG.monthMin, CFG.monthMax, plot.x0, plot.x1);
  }

  function gaussian(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerpN(a, b, t) {
    return a + (b - a) * t;
  }

  function mapN(v, a1, a2, b1, b2) {
    const t = (v - a1) / (a2 - a1);
    return b1 + (b2 - b1) * t;
  }

  function dayOfYearToMonthFloat(day) {
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

    for (let m = 1; m <= 12; m++) {
      const start = monthStarts[m - 1] + 1;
      const end = monthStarts[m];
      if (day >= start && day <= end) {
        const frac = (day - start) / Math.max(1, end - start + 1);
        return m + frac;
      }
    }
    return 12;
  }
})();