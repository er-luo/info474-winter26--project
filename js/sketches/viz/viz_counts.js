// viz_counts.js
// Blossoms "grow" as you scroll + switches through Seattle areas

(function () {

    // A blossom drawing helper
    function drawBlossom(p, x, y, r) {
      p.push();
      p.translate(x, y);
      p.noStroke();
  
      // petals
      for (let k = 0; k < 5; k++) {
        p.push();
        p.rotate((p.TWO_PI / 5) * k);
  
        // main petal
        p.fill(255, 200, 210, 190);
        p.ellipse(r * 0.65, 0, r * 1.15, r * 0.75);
  
        // soft edge shading
        p.fill(255, 170, 195, 120);
        p.ellipse(r * 0.72, 0, r * 0.85, r * 0.45);
  
        // petal notch
        p.fill(255, 255, 255, 220);
        p.ellipse(r * 1.05, 0, r * 0.28, r * 0.22);
  
        p.pop();
      }
  
      // stamens
      p.stroke(240, 200, 80, 200);
      p.strokeWeight(1);
  
      for (let i = 0; i < 10; i++) {
        const a = p.random(p.TWO_PI);
        const len = p.random(r * 0.25, r * 0.55);
        const x2 = p.cos(a) * len;
        const y2 = p.sin(a) * len;
  
        p.line(0, 0, x2, y2);
  
        p.noStroke();
        p.fill(240, 200, 80, 220);
        p.ellipse(x2, y2, r * 0.1, r * 0.1);
  
        p.stroke(240, 200, 80, 200);
      }
  
      // center
      p.noStroke();
      p.fill(255, 220, 140, 230);
      p.ellipse(0, 0, r * 0.45, r * 0.45);
  
      p.pop();
    }
  
    function clamp01(x) {
      return Math.max(0, Math.min(1, x));
    }
  
    function easeOutCubic(t) {
      t = clamp01(t);
      return 1 - Math.pow(1 - t, 3);
    }
  
    window.VizCounts = {
      draw: function (p, manager, ai, progress) {
        // I'll replace with real grouped counts later
        const places = [
          { name: "UW Campus", count: 60 },
          { name: "Washington Park Arboretum", count: 50 },
          { name: "Capitol Hill", count: 42 },
          { name: "Ballard", count: 35 },
          { name: "Downtown", count: 28 }
        ];
  
        // Use scroll progress to pick which place we’re on
        const n = places.length;
        const t = clamp01(progress || 0);
  
        // Snap to steps as you scroll (stable, easy to read)
        const idx = Math.round(t * (n - 1));
        const place = places[idx];
  
        // Growth within this step
        const stepSize = 1 / (n - 1);
        const stepStart = idx * stepSize;
        const localT = stepSize > 0 ? clamp01((t - stepStart) / stepSize) : 1;
        const grow = easeOutCubic(localT);
  
        // Visual cap so performance stays smooth
        const maxBlossoms = 140;
        const blossomsToDraw = Math.min(Math.round(place.count * grow), maxBlossoms);
  
        // Background
        p.push();
        p.background(255);
  
        // Title
        p.fill(30);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(26);
        p.text("Where are Seattle’s cherry blossoms?", 20, 18);
  
        p.textSize(18);
        p.text(place.name, 20, 58);
  
        // Big count
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(72);
        p.text(place.count, 20, 86);
  
        p.textSize(16);
        p.text("estimated cherry trees (demo numbers)", 20, 168);
  
        // Draw blossoms
        p.randomSeed(idx + 12345);
  
        // Use manager size if available, otherwise p5 canvas size
        const cw = (manager && manager.canvasWidth) ? manager.canvasWidth : p.width;
        const ch = (manager && manager.canvasHeight) ? manager.canvasHeight : p.height;
  
        const left = 220;
        const top = 70;
        const right = cw - 20;
        const bottom = ch - 20;
  
        for (let i = 0; i < blossomsToDraw; i++) {
          const x = p.random(left, right);
          const y = p.random(top, bottom);
          const r = p.random(10, 18);
  
          // Soft, blossom-like look
          p.fill(255, 182, 193, 160); // light pink
          drawBlossom(p, x, y, r);
        }
  
        p.pop();
      }
    };
  
  })();