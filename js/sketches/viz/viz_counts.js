
// Counts blossoms by Seattle area using the existing SDOT tree CSV

(function () {
  let table = null;
  let loadingStarted = false;
  let loadError = null;

  
  const DATA_PATH = "data/SDOT_Trees_data.csv";

  // Approximate centers for the named areas
  const AREA_CONFIG = [
    { name: "UW Campus", lat: 47.6553, lng: -122.3035, radiusMiles: 1.1, count: 0, blossoms: [] },
    { name: "Capitol Hill", lat: 47.6239, lng: -122.3165, radiusMiles: 1.0, count: 0, blossoms: [] },
    { name: "Fremont", lat: 47.6515, lng: -122.3500, radiusMiles: 1.0, count: 0, blossoms: [] },
    { name: "Ballard", lat: 47.6687, lng: -122.3850, radiusMiles: 1.1, count: 0, blossoms: [] },
    { name: "Downtown", lat: 47.6067, lng: -122.3325, radiusMiles: 1.0, count: 0, blossoms: [] }
  ];

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function easeOutCubic(t) {
    t = clamp01(t);
    return 1 - Math.pow(1 - t, 3);
  }

  function milesBetweenLat(aLat, bLat) {
    return Math.abs(aLat - bLat) * 69.0;
  }

  function milesBetweenLngAtLat(aLng, bLng, atLat) {
    return Math.abs(aLng - bLng) * 69.0 * Math.cos((atLat * Math.PI) / 180);
  }

  function withinRadiusMiles(lat1, lng1, lat2, lng2, radiusMiles) {
    const dx = milesBetweenLngAtLat(lng1, lng2, (lat1 + lat2) / 2);
    const dy = milesBetweenLat(lat1, lat2);
    return Math.sqrt(dx * dx + dy * dy) <= radiusMiles;
  }

  function isCherryRow(table, i) {
    const genus = (table.getString(i, "GENUS") || "").trim().toLowerCase();
    const commonName = (table.getString(i, "COMMON_NAME") || "").trim().toLowerCase();
    const lat = table.getNum(i, "SHAPE_LAT");
    const lng = table.getNum(i, "SHAPE_LNG");

    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (genus !== "prunus") return null;

    const cherryLike =
    commonName.includes("cherry") ||
    commonName.includes("sakura") ||
    commonName.includes("flowering") ||
    commonName.includes("prunus");

    if (!cherryLike) return null;

    return { lat, lng };
  }

  function computeAreaCounts() {
    for (let a = 0; a < AREA_CONFIG.length; a++) {
      AREA_CONFIG[a].count = 0;
      AREA_CONFIG[a].blossoms = [];
    }

    for (let i = 0; i < table.getRowCount(); i++) {
      const row = isCherryRow(table, i);
      if (!row) continue;

      for (let a = 0; a < AREA_CONFIG.length; a++) {
        const area = AREA_CONFIG[a];
        if (withinRadiusMiles(row.lat, row.lng, area.lat, area.lng, area.radiusMiles)) {
          area.count++;
        }
      }
    }
  }

  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function buildBlossomLayout(p, panel) {
    // Precompute stable blossom positions so they don’t flicker every frame
    const maxVisualBlossoms = 140;

    for (let a = 0; a < AREA_CONFIG.length; a++) {
      const area = AREA_CONFIG[a];
      const visualCount = Math.min(area.count, maxVisualBlossoms);
      const blossoms = [];

      for (let i = 0; i < visualCount; i++) {
        const s1 = seededRandom(a * 1000 + i * 17 + 1);
        const s2 = seededRandom(a * 1000 + i * 17 + 2);
        const s3 = seededRandom(a * 1000 + i * 17 + 3);

        blossoms.push({
          x: panel.x + 30 + s1 * (panel.w - 60),
          y: panel.y + 40 + s2 * (panel.h - 100),
          r: 8 + s3 * 8
        });
      }

      area.blossoms = blossoms;
    }
  }

  function drawBlossom(p, x, y, r) {
    p.push();
    p.translate(x, y);
    p.noStroke();

    for (let k = 0; k < 5; k++) {
      p.push();
      p.rotate((p.TWO_PI / 5) * k);

      p.fill(255, 200, 210, 190);
      p.ellipse(r * 0.65, 0, r * 1.15, r * 0.75);

      p.fill(255, 170, 195, 120);
      p.ellipse(r * 0.72, 0, r * 0.85, r * 0.45);

      p.fill(255, 255, 255, 220);
      p.ellipse(r * 1.05, 0, r * 0.28, r * 0.22);

      p.pop();
    }

    p.stroke(240, 200, 80, 200);
    p.strokeWeight(1);

    for (let i = 0; i < 8; i++) {
      const a = (p.TWO_PI / 8) * i;
      const len = r * 0.45;
      const x2 = p.cos(a) * len;
      const y2 = p.sin(a) * len;
      p.line(0, 0, x2, y2);

      p.noStroke();
      p.fill(240, 200, 80, 220);
      p.ellipse(x2, y2, r * 0.1, r * 0.1);
      p.stroke(240, 200, 80, 200);
    }

    p.noStroke();
    p.fill(255, 220, 140, 230);
    p.ellipse(0, 0, r * 0.45, r * 0.45);

    p.pop();
  }

  window.VizCounts = {
    _layoutBuiltFor: null,

    draw: function (p, manager, ai, progress) {
      p.push();
      p.background(255);

      const left = manager.offsetX || 20;
      const top = manager.offsetY || 0;
      const W = manager.width || 600;
      const H = manager.height || 520;

      const panel = {
        x: left,
        y: top + 92,
        w: W - 40,
        h: H - 120
      };

      p.noStroke();
      p.fill(30);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(24);
      p.text("Where are Seattle’s cherry blossoms?", left, top + 14);

      p.fill(90);
      p.textSize(12);
      p.text("Area counts are derived from the SDOT tree dataset.", left, top + 48);

      // Load once
      if (!loadingStarted) {
        loadingStarted = true;

        table = p.loadTable(
          DATA_PATH,
          "csv",
          "header",
          () => {
            try {
              computeAreaCounts();
              this._layoutBuiltFor = null;
            } catch (err) {
              console.error(err);
              loadError = err;
            }
          },
          (err) => {
            console.error(err);
            loadError = err;
          }
        );
      }

      if (loadError) {
        p.fill(40);
        p.textSize(14);
        p.text("Could not load the tree dataset.", left, top + 80);
        p.pop();
        return;
      }

      const hasData = AREA_CONFIG.some(d => d.count > 0);

      if (!hasData) {
        p.fill(40);
        p.textSize(14);
        p.text("Loading tree data…", left, top + 80);
        p.pop();
        return;
      }

      // Build stable blossom positions once per panel size
      const layoutKey = `${panel.x}-${panel.y}-${panel.w}-${panel.h}`;
      if (this._layoutBuiltFor !== layoutKey) {
        buildBlossomLayout(p, panel);
        this._layoutBuiltFor = layoutKey;
      }

      // FIXED PROGRESS MATH:
      const n = AREA_CONFIG.length;
      const t = clamp01(progress == null ? 0 : progress);
      
      // map progress across all areas
      let scaled = t * n;
      let idx = Math.min(Math.floor(scaled), n - 1);
      
      // local progress inside the current area
      let localT = scaled - idx;
      
      // make first and last areas visible immediately / fully
      if (idx === 0 && t === 0) localT = 1;
      if (idx === n - 1) localT = 1;
      
      const grow = easeOutCubic(localT);

      const area = AREA_CONFIG[idx];
      const maxVisualBlossoms = Math.min(area.count, area.blossoms.length);
      const blossomsToDraw = Math.max(
        8,
        Math.round(maxVisualBlossoms * grow)
      );

      // Panel
      p.fill(255);
      p.stroke(235);
      p.strokeWeight(1);
      p.rect(panel.x, panel.y, panel.w, panel.h, 16);

      p.noStroke();
      p.fill(35);
      p.textSize(20);
      p.text(area.name, panel.x + 18, panel.y + 16);

      p.fill(80);
      p.textSize(12);
      p.text("Cherry trees found in this area", panel.x + 18, panel.y + 44);

      p.fill(30);
      p.textSize(40);
      p.text(String(area.count), panel.x + 18, panel.y + 62);

      // Blossoms
      for (let i = 0; i < blossomsToDraw; i++) {
        const b = area.blossoms[i];
        drawBlossom(p, b.x, b.y, b.r);
      }

      // Step labels at bottom
      const stepY = panel.y + panel.h - 22;
      const gap = panel.w / n;

      for (let i = 0; i < n; i++) {
        const x = panel.x + gap * i + gap / 2;
        p.textAlign(p.CENTER, p.CENTER);

        if (i === idx) {
          p.fill(220, 70, 120);
          p.circle(x, stepY, 8);
          p.fill(40);
        } else {
          p.fill(160);
          p.circle(x, stepY, 6);
          p.fill(110);
        }

        p.noStroke();
        p.textSize(10);
        p.text(AREA_CONFIG[i].name, x, stepY + 18);
      }

      p.pop();
    }
  };
})();