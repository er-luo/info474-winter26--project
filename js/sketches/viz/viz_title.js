// viz_title.js
// Draw title-style screens for early active indexes (0 and 1)
(function () {
    window.VizTitle = {
        draw: function (p, manager, ai, progress) {
            var cx = p.width/ 2;
            var cy = (manager.offsetY || 0) + (manager.height || 520) / 3;

            p.push();
            p.textAlign(p.CENTER, p.CENTER);
            p.noStroke();

            if (ai === 0) {
                // Main title
                p.fill(38, 38, 38);
                p.textSize(42);
                p.textStyle(p.BOLD);
                p.text("Cherry Blossoms in Seattle", cx, cy - 20);

                // Accent line
                p.stroke(239, 85, 124);
                p.strokeWeight(3);
                p.line(cx - 140, cy + 20, cx + 140, cy + 20);
                p.noStroke();

                // Subtitle
                p.fill(95, 95, 102);
                p.textStyle(p.NORMAL);
                p.textSize(20);
                p.text("History, Place, and Change", cx, cy + 55);
            } else {
                // Author screen
                p.fill(38, 38, 38);
                p.textSize(34);
                p.textStyle(p.BOLD);
                p.text("By Erica, Taisy, and Sebastian", cx, cy);

                p.fill(118, 118, 120);
                p.textStyle(p.NORMAL);
                p.textSize(18);
                p.text("An interactive story about Seattle’s cherry blossoms", cx, cy + 40);

                p.fill(118, 118, 120);
                p.textStyle(p.NORMAL);
                p.textSize(18);
                p.text("please give a moment for the visualization to load", cx, cy + 300);
            }

            p.pop();
        }
    };
})();