// viz_cherry_timeline.js
// Interactive Cherry Blossom Planting Timeline Map (NO SCROLL)

(function () {

  let table = null;
  let loadingStarted = false;
  let loadError = null;

  let points = [];
  let bounds = null;

  let minYear = 9999;
  let maxYear = 0;
  let currentYear = null;

  let draggingTimeline = false;

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

  window.VizCherryTimeline = {

    draw: function (p, manager) {

      p.push();

      const left = manager.offsetX || 20;
      const top = manager.offsetY || 0;
      const W = manager.width || 600;
      const H = manager.height || 520;

      const panel = {
        x: left,
        y: top + 50,
        w: Math.max(300, W - 40),
        h: Math.max(260, H - 130)
      };

      const timeline = {
        x: panel.x,
        y: panel.y + panel.h + 40,
        w: panel.w,
        h: 40
      };

      p.noStroke();
      p.fill(20);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(18);
      p.text("Cherry Tree Plantings Across Seattle", left, top + 8);

      p.fill(70);
      p.textSize(11);
      p.text("Drag the timeline to travel through time.", left, top + 28);

      // ---------- LOAD DATA ----------
      if (!loadingStarted) {
        loadingStarted = true;

        table = p.loadTable(
          "data/SDOT_Trees_data.csv",
          "csv",
          "header",
          () => {

            points = [];
            minYear = 9999;
            maxYear = 0;

            for (let i = 0; i < table.getRowCount(); i++) {

              const genus = (table.getString(i, "GENUS") || "").trim().toLowerCase();
              const name  = (table.getString(i, "COMMON_NAME") || "").trim().toLowerCase();
              const lat   = table.getNum(i, "SHAPE_LAT");
              const lng   = table.getNum(i, "SHAPE_LNG");
              const plantedDate = table.getString(i, "PLANTED_DATE");

              let year = NaN;
              if (plantedDate) {
                year = new Date(plantedDate).getFullYear();
              }

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
            currentYear = minYear;
          }
        );
      }

      if (!bounds || points.length === 0) {

        p.noStroke();
        p.fill(255);
        p.rect(panel.x, panel.y, panel.w, panel.h, 14);

        p.fill(40);
        p.textSize(14);

        if (loadError) {
          p.text("Could not load tree dataset.", panel.x + 16, panel.y + 16);
        } else {
          p.text("Loading tree data…", panel.x + 16, panel.y + 16);
        }

        p.pop();
        return;
      }

      // ---------- TIMELINE INTERACTION ----------

      if (p.mouseIsPressed) {

        if (
          p.mouseX > timeline.x &&
          p.mouseX < timeline.x + timeline.w &&
          p.mouseY > timeline.y - 10 &&
          p.mouseY < timeline.y + 20
        ) {
          draggingTimeline = true;
        }

      } else {
        draggingTimeline = false;
      }

      if (draggingTimeline) {

        let t = p.constrain(
          (p.mouseX - timeline.x) / timeline.w,
          0,
          1
        );

        currentYear = Math.floor(
          p.lerp(minYear, maxYear, t)
        );
      }

      // ---------- MAP PANEL ----------

      p.noStroke();
      p.fill(255);
      p.rect(panel.x, panel.y, panel.w, panel.h, 14);

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

      let activeCount = 0;

      for (let pt of points) {

        if (pt.year <= currentYear) {

          const pos = latLngToPanelXY(p, panel, pt.lat, pt.lng);

          pt.size = p.lerp(pt.size, 4, 0.15);

          const age = currentYear - pt.year;
          const alpha = p.map(age, 0, 40, 220, 90);

          p.fill(240, 160, 195, alpha);
          p.circle(pos.x, pos.y, pt.size);

          activeCount++;

        } else {
          pt.size = 0;
        }
      }

      // ---------- YEAR LABEL ----------

      p.fill(40);
      p.textSize(28);
      p.textAlign(p.RIGHT, p.TOP);
      p.text(currentYear, panel.x + panel.w, top + 8);

      // ---------- TIMELINE BAR ----------

      p.stroke(200);
      p.strokeWeight(3);
      p.line(timeline.x, timeline.y, timeline.x + timeline.w, timeline.y);

      // timeline ticks

      p.strokeWeight(1);
      p.fill(60);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(10);

      let yearStep = Math.ceil((maxYear - minYear) / 10);

      for (let y = minYear; y <= maxYear; y += yearStep) {

        const x = p.map(y, minYear, maxYear, timeline.x, timeline.x + timeline.w);

        p.stroke(160);
        p.line(x, timeline.y - 6, x, timeline.y + 6);

        p.noStroke();
        p.text(y, x, timeline.y + 8);
      }

      // timeline handle

      const handleX = p.map(
        currentYear,
        minYear,
        maxYear,
        timeline.x,
        timeline.x + timeline.w
      );

      p.noStroke();
      p.fill(240, 160, 195);
      p.circle(handleX, timeline.y, 14);

      p.pop();
    }
  };

})();