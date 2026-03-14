(function () {
  window.VizCherryCycle = {
    CFG: {
      margin: { top: 10, right: 40, bottom: 10, left: 40 },

      title: "Somei-yoshino cherry blossom life cycle (typical year)",
      subtitle:
        "Move mouse to inspect. Only the selected milestone icon is shown.",

      bandH: 74,
      timelineYRel: 0.42,

      milestones: [
        {
          name: "Dormancy",
          doy: 15,
          iconType: "snow",
          desc:
            "Winter dormancy.\nBuds are set from last year.\nChilling accumulation supports spring bloom."
        },
        {
          name: "Bud swell",
          doy: 60,
          iconType: "bud",
          desc:
            "Bud swell begins as temperatures rise.\nSomei-yoshino responds strongly to spring warmth."
        },
        {
          name: "First bloom",
          doy: 85,
          iconType: "flower",
          desc:
            "Bloom onset.\nTrack bloom day consistently in your dataset\n(first bloom / 5% open / peak, etc.)."
        },
        {
          name: "Peak bloom",
          doy: 92,
          iconType: "flowerPeak",
          desc:
            "Peak bloom window (often about 1 week after onset).\nSomei-yoshino is famous for a brief, intense bloom."
        },
        {
          name: "Leaf-out",
          doy: 110,
          iconType: "leaf",
          desc:
            "Leaves expand after flowering.\nCanopy shifts from pink/white to green."
        },
        {
          name: "Summer canopy",
          doy: 190,
          iconType: "tree",
          desc:
            "Full canopy and growth season.\nPhotosynthesis supports storage for next year."
        },
        {
          name: "Fall color",
          doy: 290,
          iconType: "fall",
          desc:
            "Leaves senesce and may shift color.\nTiming varies with climate."
        },
        {
          name: "Leaf drop",
          doy: 320,
          iconType: "drop",
          desc:
            "Leaf fall and entry into dormancy.\nTree reallocates nutrients and prepares buds."
        }
      ],

      monthTicks: [
        { m: 1, label: "Jan" },
        { m: 2, label: "Feb" },
        { m: 3, label: "Mar" },
        { m: 4, label: "Apr" },
        { m: 5, label: "May" },
        { m: 6, label: "Jun" },
        { m: 7, label: "Jul" },
        { m: 8, label: "Aug" },
        { m: 9, label: "Sep" },
        { m: 10, label: "Oct" },
        { m: 11, label: "Nov" },
        { m: 12, label: "Dec" }
      ],

      monthStarts: [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335],
      monthLengths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    },

    attach: function (p, manager, overrides) {
      this.p = p;
      this.manager = manager;

      this.state = { milestones: [] };
      this.CFG = Object.assign({}, this.CFG, overrides || {});

      this.state.milestones = (this.CFG.milestones || []).map(m =>
        Object.assign({}, m)
      );

      this._addLateBloomIfValid();
      this._ensureBloomMilestoneSpacing();

      this._inited = true;
      return this;
    },

    setup: function () {
      const p = this.p;
      const m = this.manager;

      const w = m && m.width ? m.width : 980;
      const h = m && m.height ? m.height : 500;

      if (!p._renderer) p.createCanvas(w, h);
      p.textFont("system-ui");
    },

    resize: function () {
      const p = this.p;
      const m = this.manager;

      if (!p || !p._renderer) return;

      const w = m && typeof m.width === "number" ? m.width : p.width;
      const h = m && typeof m.height === "number" ? m.height : p.height;

      if (w !== p.width || h !== p.height) p.resizeCanvas(w, h);
    },

    draw: function (p, manager, ai, progress) {
      if (p) this.p = p;
      if (manager) this.manager = manager;

      if (!this._inited || !this.state) {
        this.attach(this.p, this.manager, {});
      }

      const cfg = this.CFG;

      this.resize();

      const W = this.p.width;
      const H = this.p.height;

      const padL = cfg.margin.left;
      const padR = cfg.margin.right;
      const padT = cfg.margin.top;
      const padB = cfg.margin.bottom;

      const x0 = padL;
      const w = W - padL - padR;

      const timelineY = padT + (H - padT - padB) * cfg.timelineYRel;
      const bandH = cfg.bandH;

      this.p.background(255);

      this.p.push();
      this.p.fill(18);
      this.p.noStroke();
      this.p.textAlign(this.p.LEFT, this.p.TOP);
      this.p.textSize(20);
      this.p.text(cfg.title, x0, 34);

      this.p.fill(80);
      this.p.textSize(12);
      this.p.text(cfg.subtitle, x0, 54);
      this.p.pop();

      this._drawSeasonBand(x0, timelineY - bandH / 2, w, bandH);
      this._drawTimelineAxis(x0 + 20, timelineY, w);

      const overViz =
        this.p.mouseX >= x0 + 20 &&
        this.p.mouseX <= x0 + 20 + w &&
        this.p.mouseY >= timelineY - 100 &&
        this.p.mouseY <= timelineY + 40;

      const doyUnderCursor = overViz
        ? this._doyFromX(this.p.mouseX, x0, w)
        : null;

      const activeMs =
        doyUnderCursor != null ? this._nearestMilestone(doyUnderCursor) : null;

      this._drawMilestonesSelective(x0, timelineY, w, activeMs);

      const inspector = this._getInspectorTarget(
        x0,
        timelineY,
        w,
        activeMs,
        doyUnderCursor
      );

      if (inspector) {
        this._drawInspectorMarker(inspector);
        this._drawTooltipAt(
          this.p.mouseX,
          this.p.mouseY,
          inspector.title,
          inspector.body
        );
        this.p.cursor(this.p.CROSS);
      } else {
        this.p.cursor(this.p.ARROW);
      }
    },

    _addLateBloomIfValid: function () {
      const ms = this.state.milestones;

      const leaf = ms.find(m => m.name === "Leaf-out");
      const first = ms.find(m => m.name === "First bloom");

      if (!leaf) return;

      const leafDoy = leaf.doy;
      const lateDoy = leafDoy - 7;

      if (!(lateDoy < leafDoy)) return;
      if (first && !(lateDoy > first.doy)) return;

      const late = {
        name: "Late bloom",
        doy: lateDoy,
        iconType: "flowerLate",
        desc:
          "Late bloom window (end of flowering).\nPetal fall increases; transition toward leaf expansion.\nTiming varies with weather."
      };

      const peakIdx = ms.findIndex(m => m.name === "Peak bloom");
      const insertAt = peakIdx >= 0 ? peakIdx + 1 : 0;

      ms.splice(insertAt, 0, late);
      ms.sort((a, b) => a.doy - b.doy);
    },

    _ensureBloomMilestoneSpacing: function () {
      const ms = this.state.milestones;
      const first = ms.find(m => m.name === "First bloom");
      const peak = ms.find(m => m.name === "Peak bloom");
      if (!first || !peak) return;

      if (peak.doy <= first.doy) peak.doy = Math.min(365, first.doy + 7);
      if (Math.abs(peak.doy - first.doy) < 5) {
        peak.doy = Math.min(365, first.doy + 7);
      }

      const leaf = ms.find(m => m.name === "Leaf-out");
      if (leaf && peak.doy >= leaf.doy) {
        peak.doy = Math.max(first.doy + 5, leaf.doy - 5);
      }

      ms.sort((a, b) => a.doy - b.doy);
    },

    _getInspectorTarget: function (x, timelineY, w, activeMs, doyUnderCursor) {
      const p = this.p;

      const overViz =
        p.mouseX >= x &&
        p.mouseX <= x + w &&
        p.mouseY >= timelineY - 120 &&
        p.mouseY <= timelineY + 40;

      if (!overViz) return null;

      if (doyUnderCursor != null && activeMs) {
        return {
          kind: "milestone",
          x: this._xFromDOY(activeMs.doy, x, w),
          y: this._milestoneYFor(activeMs.name, timelineY),
          title: `${activeMs.name} (${this._doyToMonthDay(activeMs.doy)})`,
          body: activeMs.desc
        };
      }

      return null;
    },

    _drawInspectorMarker: function (t) {
      const p = this.p;

      p.noFill();
      p.stroke(20);
      p.strokeWeight(2);
      p.circle(t.x, t.y, 26);

      p.stroke(20, 20, 20, 90);
      p.strokeWeight(1);
      p.line(t.x, t.y, p.mouseX, p.mouseY);
    },

    _drawTimelineAxis: function (x, y, w) {
      const p = this.p;
      const cfg = this.CFG;

      p.stroke(30);
      p.strokeWeight(2);
      p.line(x, y, x + w-45, y);

      for (let i = 0; i < cfg.monthTicks.length; i++) {
        const mt = cfg.monthTicks[i];
        const doy = cfg.monthStarts[mt.m - 1];
        const tx = this._xFromDOY(doy, x, w);

        p.stroke(30);
        p.strokeWeight(1);
        p.line(tx, y - 10, tx, y + 10);

        p.noStroke();
        p.fill(40);
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(11);
        p.text(mt.label, tx, y + 14);
      }
    },

    _drawSeasonBand: function (x, y, w, h) {
      const p = this.p;

      const segs = [
        { a: 1, b: 59, c: p.color(232, 242, 255) },
        { a: 60, b: 151, c: p.color(255, 236, 246) },
        { a: 152, b: 243, c: p.color(234, 255, 235) },
        { a: 244, b: 334, c: p.color(255, 244, 224) },
        { a: 335, b: 365, c: p.color(232, 242, 255) }
      ];

      p.noStroke();
      p.fill(245);
      p.rect(x, y, w, h, 18);

      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const x1 = this._xFromDOY(s.a, x, w);
        const x2 = this._xFromDOY(s.b, x, w);
        p.fill(s.c);
        p.rect(x1, y, Math.max(2, x2 - x1), h, 18);
      }

      p.noFill();
      p.stroke(200);
      p.strokeWeight(1);
      p.rect(x, y, w, h, 18);

      p.noStroke();
      p.fill(70);
      p.textSize(12);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text("Typical phenology band", x + 14, y - 0);
    },

    _milestoneYFor: function (name, timelineY) {
      const base = timelineY - 82;

      if (name === "Dormancy") return base - 10;
      if (name === "Bud swell") return base + 22;

      if (name === "First bloom") return base - 38;
      if (name === "Peak bloom") return base - 2;
      if (name === "Late bloom") return base + 30;

      if (name === "Leaf-out") return base - 14;
      if (name === "Summer canopy") return base + 18;
      if (name === "Fall color") return base - 14;
      if (name === "Leaf drop") return base + 18;

      return base;
    },

    _bottomLabelYFor: function (name, timelineY) {
      const row1 = timelineY + 78;
      const row2 = timelineY + 106;
      const row3 = timelineY + 134;

      if (name === "Dormancy") return row1;
      if (name === "Bud swell") return row2;

      if (name === "First bloom") return row1;
      if (name === "Peak bloom") return row3;
      if (name === "Late bloom") return row1;

      if (name === "Leaf-out") return row2;
      if (name === "Summer canopy") return row1;
      if (name === "Fall color") return row1;
      if (name === "Leaf drop") return row2;

      return row1;
    },

    _bottomLabelXFor: function (name, px) {
      if (name === "Bud swell") return px - 6;

      if (name === "First bloom") return px - 12;
      if (name === "Peak bloom") return px;
      if (name === "Late bloom") return px + 10;
      if (name === "Leaf-out") return px + 12;

      return px;
    },

    _labelTextFor: function (name) {
      return name;
    },

    _drawMilestonesSelective: function (x, timelineY, w, activeMs) {
      const p = this.p;
      const ms = this.state.milestones;

      for (let i = 0; i < ms.length; i++) {
        const m = ms[i];
        const px = this._xFromDOY(m.doy, x, w);
        const py = this._milestoneYFor(m.name, timelineY);

        const labelX = this._bottomLabelXFor(m.name, px);
        const labelY = this._bottomLabelYFor(m.name, timelineY);

        // keep only the bottom connector line
        p.stroke(185);
        p.strokeWeight(1);
        p.line(px, timelineY + 10, px, labelY - 6);

        p.noStroke();
        p.fill(40);
        p.textSize(8);
        p.textAlign(p.CENTER, p.TOP);
        p.text(this._labelTextFor(m.name), labelX, labelY);

        if (activeMs && m === activeMs) {
          this._drawIcon(m.iconType, px, py, 16);
        }
      }
    },

    _drawTooltipAt: function (mx, my, title, body) {
      const p = this.p;

      const pad = 10;
      const maxW = 360;

      p.textAlign(p.LEFT, p.TOP);

      p.textSize(12);
      const titleW = Math.min(maxW, p.textWidth(title) + pad * 2);

      p.textSize(11);
      const lines = String(body || "").split("\n");
      let bodyW = 0;
      for (let i = 0; i < lines.length; i++) {
        bodyW = Math.max(bodyW, p.textWidth(lines[i]));
      }
      bodyW = Math.min(maxW, bodyW + pad * 2);

      const boxW = Math.max(titleW, bodyW);
      const boxH = 14 + pad + lines.length * 14 + pad;

      let bx = mx + 14;
      let by = my + 14;
      if (bx + boxW > p.width - 10) bx = mx - 14 - boxW;
      if (by + boxH > p.height - 10) by = my - 14 - boxH;

      p.noStroke();
      p.fill(20, 20, 20, 235);
      p.rect(bx, by, boxW, boxH, 10);

      p.fill(255);
      p.textSize(12);
      p.text(title, bx + pad, by + pad);

      p.fill(230);
      p.textSize(11);
      for (let i = 0; i < lines.length; i++) {
        p.text(lines[i], bx + pad, by + pad + 18 + i * 14);
      }
    },

    _drawIcon: function (type, x, y, r) {
      const p = this.p;

      p.push();
      p.translate(x, y);

      p.noStroke();
      p.fill(255);
      p.circle(0, 0, r * 2 + 6);
      p.stroke(180);
      p.strokeWeight(1);
      p.noFill();
      p.circle(0, 0, r * 2 + 6);

      p.noStroke();

      if (type === "snow") {
        p.fill(90, 150, 220);
        for (let i = 0; i < 6; i++) {
          p.push();
          p.rotate((p.TWO_PI * i) / 6);
          p.rect(-1, -r + 2, 2, r - 2, 2);
          p.pop();
        }
        p.circle(0, 0, 4);
      } else if (type === "bud") {
        p.fill(210, 80, 140);
        p.ellipse(0, 2, r * 1.0, r * 1.3);
        p.fill(90, 170, 110);
        p.triangle(-6, 8, 0, 2, 6, 8);
      } else if (type === "flower" || type === "flowerLate") {
        p.fill(245, 160, 200);
        for (let i = 0; i < 5; i++) {
          p.push();
          p.rotate((p.TWO_PI * i) / 5);
          p.ellipse(0, -r * 0.55, r * 0.9, r * 0.7);
          p.pop();
        }
        p.fill(255, 220, 120);
        p.circle(0, 0, 6);
      } else if (type === "flowerPeak") {
        p.fill(245, 150, 195);
        for (let i = 0; i < 8; i++) {
          p.push();
          p.rotate((p.TWO_PI * i) / 8);
          p.ellipse(0, -r * 0.55, r * 0.8, r * 0.65);
          p.pop();
        }
        p.fill(255, 215, 110);
        p.circle(0, 0, 7);
      } else if (type === "leaf") {
        p.fill(80, 180, 110);
        p.beginShape();
        p.vertex(0, -r * 0.9);
        p.bezierVertex(r * 0.9, -r * 0.3, r * 0.5, r * 0.9, 0, r * 0.8);
        p.bezierVertex(-r * 0.5, r * 0.9, -r * 0.9, -r * 0.3, 0, -r * 0.9);
        p.endShape(p.CLOSE);
        p.stroke(60, 130, 90);
        p.strokeWeight(1);
        p.line(0, -r * 0.7, 0, r * 0.6);
      } else if (type === "tree") {
        p.fill(140, 95, 60);
        p.rect(-3, 4, 6, r * 0.9, 2);
        p.fill(90, 180, 120);
        p.circle(0, 0, r * 1.2);
        p.circle(-r * 0.5, 2, r * 0.9);
        p.circle(r * 0.5, 2, r * 0.9);
      } else if (type === "fall") {
        p.fill(235, 150, 70);
        p.beginShape();
        p.vertex(0, -r * 0.9);
        p.bezierVertex(r * 0.9, -r * 0.3, r * 0.5, r * 0.9, 0, r * 0.8);
        p.bezierVertex(-r * 0.5, r * 0.9, -r * 0.9, -r * 0.3, 0, -r * 0.9);
        p.endShape(p.CLOSE);
        p.stroke(190, 110, 50);
        p.strokeWeight(1);
        p.line(0, -r * 0.7, 0, r * 0.6);
      } else if (type === "drop") {
        p.fill(170);
        p.ellipse(0, 2, r * 1.0, r * 1.2);
        p.fill(120);
        p.triangle(-6, 8, 0, 2, 6, 8);
      } else {
        p.fill(120);
        p.circle(0, 0, 8);
      }

      p.pop();
    },

    _nearestMilestone: function (doy) {
      const ms = this.state.milestones;
      let best = ms[0];
      let bestDist = Infinity;
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i];
        const d = Math.abs(m.doy - doy);
        if (d < bestDist) {
          bestDist = d;
          best = m;
        }
      }
      return best;
    },

    _xFromDOY: function (doy, x, w) {
      const d = Math.max(1, Math.min(365, doy));
      return x + ((d - 1) / 364) * w;
    },

    _doyFromX: function (px, x, w) {
      const t = Math.max(0, Math.min(1, (px - x) / w));
      return Math.round(1 + t * 364);
    },

    _doyToMonthDay: function (doy) {
      const cfg = this.CFG;
      let d = Math.floor(Math.max(1, Math.min(365, doy)));
      let m = 0;
      while (m < 12 && d > cfg.monthLengths[m]) {
        d -= cfg.monthLengths[m];
        m++;
      }
      const names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      return `${names[m]} ${d}`;
    }
  };
})();