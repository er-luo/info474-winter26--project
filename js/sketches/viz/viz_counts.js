// viz_counts.js
// Blossoms "grow" as you scroll + switches through Seattle areas

(function () {
    // A simple blossom drawing helper
    function drawBlossom(p, x, y, r) {
      p.push();
      p.translate(x, y);
      p.noStroke();
  
      // petals
      for (let k = 0; k < 5; k++) {
        p.push();
        p.rotate((p.TWO_PI / 5) * k);
        p.ellipse(r * 0.55, 0, r * 0.9, r * 0.55);
        p.pop();
      }
  
      // center
      p.ellipse(0, 0, r * 0.55, r * 0.55);
      p.pop();
    }
  
    function clamp01(x) {
      return Math.max(0, Math.min(1, x));
    }
  
    // Nice easing so it feels like "growing"
    function easeOutCubic(t) {
      t = clamp01(t);
      return 1 - Math.pow(1 - t, 3);
    }
  
    window.VizCounts = {
      draw: function (p, manager, ai, progress) {
        // Replace these with real grouped counts later
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
  
        // Growth within this step: use fractional progress around the snapped idx
        // This makes blossoms "grow" even if idx stays same for a bit
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
  
        // Title / label
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
  
        // Draw blossoms (stable positions per place)
        p.randomSeed(idx + 12345);
  
        const left = 220;
        const top = 70;
        const right = manager.canvasWidth - 20;
        const bottom = manager.canvasHeight - 20;
  
        for (let i = 0; i < blossomsToDraw; i++) {
          const x = p.random(left, right);
          const y = p.random(top, bottom);
          const r = p.random(10, 18);
  
          // Soft, blossom-like look
          p.fill(255, 182, 193, 160); // light pink
          drawBlossom(p, x, y, r);
  
          p.fill(255, 215, 0, 170); // soft gold center
          p.ellipse(x, y, r * 0.35, r * 0.35);
        }
  
        p.pop();
      }
    };
  })();