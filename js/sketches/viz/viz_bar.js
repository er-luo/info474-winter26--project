// viz_bar.js
// Density Map of Cherry Blossoms in Major Areas of Seattle
// Data: Seattle street tree inventory (public right-of-way)
// Filter: GENUS=Prunus AND COMMON_NAME contains "cherry"
// Interaction: Hover any grid square to see the count

(function () {

    // Cache across frames
    let table = null;
    let loadingStarted = false;
    let loadError = null;
  
    let points = [];         // filtered cherry points: {lat,lng}
    let bounds = null;       // {minLat,maxLat,minLng,maxLng}
  
    // Density grid
    let gridCounts = [];
    let maxCount = 0;
    let outlineThreshold = 1; // top 10% cutoff
  
    // Tunables
    const GRID_COLS = 120;
    const GRID_ROWS = 90;
  
    // Orientation labels (rough anchors)
    const clusters = [
      { name: "Downtown",     lat: 47.6067, lng: -122.3325 },
      { name: "Capitol Hill", lat: 47.6239, lng: -122.3165 },
      { name: "UW",           lat: 47.6553, lng: -122.3035 },
      { name: "Fremont",      lat: 47.6515, lng: -122.3500 },
      { name: "Ballard",      lat: 47.6687, lng: -122.3850 },
      { name: "Queen Anne",   lat: 47.6375, lng: -122.3560 },
      { name: "SODO",         lat: 47.5799, lng: -122.3240 },
      { name: "West Seattle", lat: 47.5615, lng: -122.3860 }
    ];
  
    // ----- distance helpers (approx miles) -----
    function milesBetweenLat(aLat, bLat) {
      return Math.abs(aLat - bLat) * 69.0; // 1° lat ≈ 69 miles
    }
    function milesBetweenLngAtLat(aLng, bLng, atLat) {
      return Math.abs(aLng - bLng) * 69.0 * Math.cos((atLat * Math.PI) / 180);
    }
  
    function computeBounds(pts) {
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
      }
      return { minLat, maxLat, minLng, maxLng };
    }
  
    function padBounds(b, pct) {
      const dLat = (b.maxLat - b.minLat) * pct;
      const dLng = (b.maxLng - b.minLng) * pct;
      return {
        minLat: b.minLat - dLat,
        maxLat: b.maxLat + dLat,
        minLng: b.minLng - dLng,
        maxLng: b.maxLng + dLng
      };
    }
  
    function buildGrid(p, pts) {
      gridCounts = new Array(GRID_COLS * GRID_ROWS).fill(0);
      maxCount = 0;
  
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const c = Math.floor(p.map(pt.lng, bounds.minLng, bounds.maxLng, 0, GRID_COLS));
        const r = Math.floor(p.map(pt.lat, bounds.minLat, bounds.maxLat, GRID_ROWS, 0)); // north up
        if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
          const idx = r * GRID_COLS + c;
          gridCounts[idx]++;
          if (gridCounts[idx] > maxCount) maxCount = gridCounts[idx];
        }
      }
  
      // Outline top ~10% of non-zero squares
      const nonzero = gridCounts.filter(v => v > 0).sort((a, b) => a - b);
      outlineThreshold = nonzero.length ? nonzero[Math.floor(nonzero.length * 0.90)] : 1;
    }
  
    function latLngToPanelXY(p, panel, lat, lng) {
      const x = p.map(lng, bounds.minLng, bounds.maxLng, panel.x, panel.x + panel.w);
      const y = p.map(lat, bounds.minLat, bounds.maxLat, panel.y + panel.h, panel.y);
      return { x, y };
    }
  
    function drawClusters(p, panel) {
      for (let i = 0; i < clusters.length; i++) {
        const c = clusters[i];
        const pt = latLngToPanelXY(p, panel, c.lat, c.lng);
  
        p.stroke(0, 0, 0, 140);
        p.strokeWeight(1);
        p.fill(255, 255, 255, 230);
        p.circle(pt.x, pt.y, 10);
  
        p.noStroke();
        p.fill(15, 15, 15, 175);
        p.textSize(11);
        p.textAlign(p.LEFT, p.BASELINE);
        p.text(c.name, pt.x + 7, pt.y - 7);
      }
    }
  
    function drawHoverTooltip(p, panel, cellWmi, cellHmi) {
      // Only if mouse is inside the panel
      if (p.mouseX < panel.x || p.mouseX > panel.x + panel.w || p.mouseY < panel.y || p.mouseY > panel.y + panel.h) {
        return;
      }
  
      const cellW = panel.w / GRID_COLS;
      const cellH = panel.h / GRID_ROWS;
  
      const c = Math.floor((p.mouseX - panel.x) / cellW);
      const r = Math.floor((p.mouseY - panel.y) / cellH);
  
      if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) return;
  
      const idx = r * GRID_COLS + c;
      const count = gridCounts[idx] || 0;
  
      // Highlight the hovered square
      p.noFill();
      p.stroke(0, 0, 0, 160);
      p.strokeWeight(1);
      p.rect(panel.x + c * cellW, panel.y + r * cellH, cellW, cellH);
  
      // Tooltip
      const pad = 8;
      const msg1 = `Trees in this square: ${count}`;
      const msg2 = `Square size ~ ${cellWmi.toFixed(2)} mi × ${cellHmi.toFixed(2)} mi`;
  
      p.textSize(12);
      const tw = Math.max(p.textWidth(msg1), p.textWidth(msg2)) + pad * 2;
      const th = 36;
  
      let tx = p.mouseX + 12;
      let ty = p.mouseY + 12;
      if (tx + tw > panel.x + panel.w) tx = p.mouseX - tw - 12;
      if (ty + th > panel.y + panel.h) ty = p.mouseY - th - 12;
  
      p.noStroke();
      p.fill(255, 245);
      p.stroke(200);
      p.rect(tx, ty, tw, th, 8);
  
      p.noStroke();
      p.fill(20);
      p.textAlign(p.LEFT, p.TOP);
      p.text(msg1, tx + pad, ty + 6);
      p.fill(90);
      p.text(msg2, tx + pad, ty + 20);
    }
  
    function drawLegend(p, panel, cellWmi, cellHmi) {
      const legendX = panel.x + panel.w + 25;
      const legendY = panel.y + 55;
      const legendW = 26;
      const legendH = 240;
  
      p.noStroke();
      p.fill(20);
      p.textSize(14);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text("Density", legendX, legendY - 18);
  
      p.fill(70);
      p.textSize(11);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text("trees per grid square", legendX, legendY - 4);
  
      // gradient
      for (let i = 0; i < legendH; i++) {
        const t = 1 - i / (legendH - 1);
        const alpha = 55 + 190 * Math.pow(t, 1.0);
        p.fill(220, 60, 120, alpha);
        p.rect(legendX, legendY + i, legendW, 1);
      }
  
      p.noFill();
      p.stroke(200);
      p.rect(legendX, legendY, legendW, legendH);
  
      p.noStroke();
      p.fill(30);
      p.textSize(11);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(String(maxCount), legendX + legendW + 10, legendY + 2);
      p.text("0", legendX + legendW + 10, legendY + legendH - 2);
  
      // Explain the square size
      p.textAlign(p.LEFT, p.TOP);
      p.fill(90);
      p.text(`Each square ≈ ${cellWmi.toFixed(2)} mi × ${cellHmi.toFixed(2)} mi`, legendX, legendY + legendH + 10);
  
      // Explain outline (no "hotspots")
      p.fill(60);
      p.text(`Outlined = top 10% density`, legendX, legendY + legendH + 28);
    }
  
    window.VizBar = {
      draw: function (p, manager, ai, progress) {
        p.push();
  
        // Layout consistent with the group viz system
        const left = manager.offsetX || 20;
        const top = manager.offsetY || 0;
  
        const W = (manager.width || 600);
        const H = (manager.height || 520);
  
        // Leave room for legend on the right
        const panel = {
          x: left,
          y: top + 40,
          w: Math.max(300, W - 220),
          h: Math.max(260, H - 70)
        };
  
        // Title + subtitle (NO “SDOT”)
        p.noStroke();
        p.fill(20);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(18);
        p.text("Density Map of Cherry Blossoms in Major Areas of Seattle", left, top + 8);
  
        p.fill(70);
        p.textSize(11);
        p.text("Seattle street tree inventory (public right-of-way). Hover to see counts.", left, top + 28);
  
        // ---------- LOAD ONCE ----------
        if (!loadingStarted) {
          loadingStarted = true;
  
          // IMPORTANT: paths are relative to index.html (project root)
          const path = "data/SDOT_Trees_data.csv";
  
          table = p.loadTable(
            path,
            "csv",
            "header",
            () => {
              try {
                points = [];
  
                for (let i = 0; i < table.getRowCount(); i++) {
                  const genus = (table.getString(i, "GENUS") || "").trim().toLowerCase();
                  const name  = (table.getString(i, "COMMON_NAME") || "").trim().toLowerCase();
                  const lat   = table.getNum(i, "SHAPE_LAT");
                  const lng   = table.getNum(i, "SHAPE_LNG");
  
                  if (genus === "prunus" && name.includes("cherry") && isFinite(lat) && isFinite(lng)) {
                    points.push({ lat, lng });
                  }
                }
  
                bounds = padBounds(computeBounds(points), 0.03);
                buildGrid(p, points);
  
                // Debug (optional)
                // console.log("Loaded rows:", table.getRowCount(), "Cherry points:", points.length);
  
              } catch (e) {
                loadError = e;
                console.log("processing failed:", e);
              }
            },
            (err) => {
              loadError = err || {};
              console.log("data load failed:", err);
            }
          );
        }
  
        // ---------- LOADING / ERROR ----------
        if (!bounds || gridCounts.length === 0) {
          p.noStroke();
          p.fill(255);
          p.rect(panel.x, panel.y, panel.w, panel.h, 14);
  
          p.fill(40);
          p.textSize(14);
          p.textAlign(p.LEFT, p.TOP);
  
          if (loadError) {
            p.text("Could not load the tree dataset.", panel.x + 16, panel.y + 16);
            p.textSize(12);
            p.fill(80);
            p.text("Make sure you're running via Live Server, and the file exists at:", panel.x + 16, panel.y + 40);
            p.text("data/SDOT_Trees_data.csv", panel.x + 16, panel.y + 58);
          } else {
            p.text("Loading tree data…", panel.x + 16, panel.y + 16);
            p.textSize(12);
            p.fill(80);
            p.text("If this stays forever, it’s usually a server/path issue.", panel.x + 16, panel.y + 40);
          }
  
          p.pop();
          return;
        }
  
        // ---------- CELL SIZE (IN MILES) ----------
        const midLat = (bounds.minLat + bounds.maxLat) / 2;
        const cellLatDeg = (bounds.maxLat - bounds.minLat) / GRID_ROWS;
        const cellLngDeg = (bounds.maxLng - bounds.minLng) / GRID_COLS;
        const cellHmi = milesBetweenLat(bounds.minLat, bounds.minLat + cellLatDeg);
        const cellWmi = milesBetweenLngAtLat(bounds.minLng, bounds.minLng + cellLngDeg, midLat);
  
        // ---------- DRAW PANEL ----------
        p.noStroke();
        p.fill(255);
        p.rect(panel.x, panel.y, panel.w, panel.h, 14);
  
        // subtle grid lines
        p.stroke(235);
        p.strokeWeight(1);
        for (let i = 1; i < 6; i++) {
          const gx = p.lerp(panel.x, panel.x + panel.w, i / 6);
          p.line(gx, panel.y, gx, panel.y + panel.h);
        }
        for (let i = 1; i < 5; i++) {
          const gy = p.lerp(panel.y, panel.y + panel.h, i / 5);
          p.line(panel.x, gy, panel.x + panel.w, gy);
        }
  
        // density squares
        const cellW = panel.w / GRID_COLS;
        const cellH = panel.h / GRID_ROWS;
  
        p.noStroke();
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const idx = r * GRID_COLS + c;
            const count = gridCounts[idx];
            if (count <= 0) continue;
  
            const t = Math.pow(count / maxCount, 0.35);
            p.fill(220, 60, 120, 55 + 190 * t);
  
            const x = panel.x + c * cellW;
            const y = panel.y + r * cellH;
            p.rect(x, y, cellW + 0.25, cellH + 0.25);
  
            // outline top 10%
            if (count >= outlineThreshold) {
              p.stroke(0, 0, 0, 150);
              p.strokeWeight(0.6);
              p.noFill();
              p.rect(x, y, cellW + 0.25, cellH + 0.25);
              p.noStroke();
            }
          }
        }
  
        // orientation labels
        drawClusters(p, panel);
  
        // hover tooltip + outline for hovered square
        drawHoverTooltip(p, panel, cellWmi, cellHmi);
  
        // border + north marker
        p.noFill();
        p.stroke(210);
        p.rect(panel.x, panel.y, panel.w, panel.h, 14);
  
        p.noStroke();
        p.fill(40);
        p.textSize(12);
        p.textStyle(p.BOLD);
        p.textAlign(p.LEFT, p.TOP);
        p.text("N", panel.x + panel.w - 18, panel.y + 8);
        p.textStyle(p.NORMAL);
  
        // legend (no “cell”, no “hotspots”)
        drawLegend(p, panel, cellWmi, cellHmi);
  
        // footer (no “SDOT”)
        p.noStroke();
        p.fill(80);
        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        p.text(
          `Source: Seattle street tree inventory (public right-of-way) | Cherry-like Prunus points: ${points.length.toLocaleString()} | Grid: ${GRID_COLS}×${GRID_ROWS}`,
          left,
          panel.y + panel.h + 10
        );
  
        p.pop();
      }
    };
  
  })();