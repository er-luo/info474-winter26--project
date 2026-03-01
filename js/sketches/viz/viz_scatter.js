// viz_cherry_timeline.js
// Scroll-driven Cherry Blossom Planting Timeline Map
// Based on viz_bar.js geographic panel structure

(function () {

  // ---------- STATE (persist across frames) ----------
  let table = null;
  let loadingStarted = false;
  let loadError = null;

  let points = [];       // {lat,lng,year,size}
  let bounds = null;
  let minYear = 9999;
  let maxYear = 0;

  let activeCount = 0;   // how many trees are currently visible

  // ---------- HELPERS ----------
  function computeBounds(pts) {
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (let p of pts) {
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

  function latLngToPanelXY(p, panel, lat, lng) {
    const x = p.map(lng, bounds.minLng, bounds.maxLng, panel.x, panel.x + panel.w);
    const y = p.map(lat, bounds.minLat, bounds.maxLat, panel.y + panel.h, panel.y);
    return { x, y };
  }

  // ---------- VIZ ----------
  window.VizCherryTimeline = {
    draw: function (p, manager, ai, progress) {

      p.push();

      const left = manager.offsetX || 20;
      const top = manager.offsetY || 0;
      const W = (manager.width || 600);
      const H = (manager.height || 520);

      const panel = {
        x: left,
        y: top + 50,
        w: Math.max(300, W - 40),
        h: Math.max(260, H - 90)
      };

      // ---------- TITLE ----------
      p.noStroke();
      p.fill(20);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(18);
      p.text("Cherry Tree Plantings Across Seattle", left, top + 8);

      p.fill(70);
      p.textSize(11);
      p.text("Scroll to move forward in time.", left, top + 28);

      // ---------- LOAD ONCE ----------
      if (!loadingStarted) {
        loadingStarted = true;

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
                const year  = table.getNum(i, "PLANTING_YEAR");

                if (
                  genus === "prunus" &&
                  name.includes("cherry") &&
                  isFinite(lat) &&
                  isFinite(lng) &&
                  isFinite(year)
                ) {
                  points.push({ lat, lng, year, size: 0 });
                  if (year < minYear) minYear = year;
                  if (year > maxYear) maxYear = year;
                }
              }

              points.sort((a, b) => a.year - b.year);

              bounds = padBounds(computeBounds(points), 0.03);

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
      if (!bounds || points.length === 0) {
        p.noStroke();
        p.fill(255);
        p.rect(panel.x, panel.y, panel.w, panel.h, 14);

        p.fill(40);
        p.textSize(14);
        p.textAlign(p.LEFT, p.TOP);

        if (loadError) {
          p.text("Could not load the tree dataset.", panel.x + 16, panel.y + 16);
        } else {
          p.text("Loading tree data…", panel.x + 16, panel.y + 16);
        }

        p.pop();
        return;
      }

      // ---------- MAP SCROLL TO YEAR ----------
      const currentYear = Math.floor(
        p.map(progress, 0, 1, minYear, maxYear)
      );

      // Efficient cumulative growth
      while (
        activeCount < points.length &&
        points[activeCount].year <= currentYear
      ) {
        activeCount++;
      }

      // If scrolling backwards
      if (activeCount > 0 && points[activeCount - 1].year > currentYear) {
        activeCount = 0;
        for (let pt of points) pt.size = 0;
      }

      // ---------- DRAW PANEL ----------
      p.noStroke();
      p.fill(255);
      p.rect(panel.x, panel.y, panel.w, panel.h, 14);

      // subtle reference grid
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

      // ---------- DRAW TREES ----------
      p.noStroke();

      for (let i = 0; i < activeCount; i++) {

        const pt = points[i];
        const pos = latLngToPanelXY(p, panel, pt.lat, pt.lng);

        // growth animation
        pt.size = p.lerp(pt.size, 4, 0.15);

        const age = currentYear - pt.year;
        const alpha = p.map(age, 0, 40, 220, 90);

        p.fill(240, 160, 195, alpha);
        p.circle(pos.x, pos.y, pt.size);
      }

      // ---------- YEAR DISPLAY ----------
      p.fill(40);
      p.textSize(28);
      p.textAlign(p.RIGHT, p.TOP);
      p.text(currentYear, panel.x + panel.w, top + 8);

      // ---------- FOOTER ----------
      p.noStroke();
      p.fill(80);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text(
        `Source: Seattle street tree inventory (public right-of-way) | Cherry trees planted: ${activeCount.toLocaleString()}`,
        left,
        panel.y + panel.h + 10
      );

      p.pop();
    }
  };

})();