// sketch_renderer.js

// Responsible for rendering the main visualization based on the current active index
(function () {
    window.Renderer = {

        setData: function (manager) {
            var self = this;

            manager.offsetX = (manager.margin && manager.margin.left) || 20;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;

            function computeLayout(data) {
                manager.data = data;
            }

            computeLayout([]);
            return Promise.resolve(manager.data);
        },

        draw: function (p, manager, ai, progress) {
            try {
              if (ai === 0 || ai === 1) {
                window.VizTitle?.draw?.(p, manager, ai, progress);
                return;
              }

              if (ai === 4) {
                window.VizCounts.draw(p, manager, ai, progress);
                return;
              }
          
              if (ai >= 4 && ai < 7) {
                window.VizCherryTimeline?.draw?.(p, manager, ai, progress);
                return;
              }
          
              if (ai === 7) {
                window.VizBar?.draw?.(p, manager, ai, progress);
                return;
              }
          
              if (ai === 8) {
                window.VizCherry?.draw?.(p, manager, ai, progress);
                return;
              }
            } catch (e) {
              console.error("Renderer draw error:", e);
              // Keep p5 alive even if one viz crashes
              p.push();
              p.fill(30);
              p.textSize(14);
              p.textAlign(p.LEFT, p.TOP);
              p.text("Visualization error (check console).", 20, 20);
              p.pop();
            }
          }
    };
})();
