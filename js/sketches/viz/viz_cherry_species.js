// viz_cherry_species.js
// Cherry blossom species tree with counts

(function () {

  let sdotTable = null;
  let uwTable = null;

  let speciesCounts = {};
  let speciesList = [];

  let loadingStarted = false;

  function processSDOT() {

    for (let i = 0; i < sdotTable.getRowCount(); i++) {

      const genus = sdotTable.getString(i, "GENUS");
      const common = (sdotTable.getString(i, "COMMON_NAME") || "").toLowerCase();

      if (genus === "Prunus" && common.includes("cherry")) {

        let species = sdotTable.getString(i, "SCIENTIFIC_NAME");

        if (!species) species = common;

        if (!speciesCounts[species]) speciesCounts[species] = 0;

        speciesCounts[species]++;
      }
    }
  }

  function processUW() {

    let seenSpecies = {};

    for (let i = 0; i < uwTable.getRowCount(); i++) {

      let plant = uwTable.getString(i, "PLANT");
      let match = plant.match(/\((.*?)\)/);

      if (match) {

        let species = match[1];

        if (!seenSpecies[species]) {

          seenSpecies[species] = true;

          if (!speciesCounts[species]) speciesCounts[species] = 0;

          speciesCounts[species] += 30; // approx UW grove
        }
      }
    }
  }

  window.VizCherrySpecies = {

    draw: function (p, manager) {

      const left = manager.offsetX || 20;
      const top = manager.offsetY || 0;
      const W = manager.width || 600;
      const H = manager.height || 520;

      // ---------- LOAD DATA ONCE ----------
      if (!loadingStarted) {

        loadingStarted = true;

        sdotTable = p.loadTable(
          "data/SDOT_Trees_data.csv",
          "csv",
          "header",
          () => {

            uwTable = p.loadTable(
              "data/Maust_et_al_data/blossom_dates.csv",
              "csv",
              "header",
              () => {

                processSDOT();
                processUW();

                speciesList = Object.keys(speciesCounts);

                // sort by abundance
                speciesList.sort((a, b) => speciesCounts[b] - speciesCounts[a]);
              }
            );

          }
        );
      }

      p.push();

      p.background(252,248,250);

      if (speciesList.length === 0) {

        p.fill(40);
        p.textAlign(p.CENTER);
        p.text("Loading species data...", W/2, H/2);

        p.pop();
        return;
      }

      drawTree(p, left + 60, top + 80, W, H);

      p.pop();
    }
  };

  function drawTree(p, startX, startY, W, H) {

    let trunkHeight = H - 160;

    // trunk
    p.stroke(120,90,100);
    p.strokeWeight(4);
    p.line(startX, startY, startX, startY + trunkHeight);

    // root label
    p.noStroke();
    p.fill(40);
    p.textSize(18);
    p.textAlign(p.LEFT);
    p.text("Prunus (Cherry Trees)", startX - 10, startY - 25);

    let spacing = trunkHeight / speciesList.length;

    let maxCount = Math.max(...Object.values(speciesCounts));

    for (let i = 0; i < speciesList.length; i++) {

      let species = speciesList[i];
      let count = speciesCounts[species];

      let y = startY + spacing * i;

      let branchLength = p.map(count, 0, maxCount, 120, 320);

      // branch
      p.stroke(170,140,150);
      p.strokeWeight(p.map(count,0,maxCount,1,6));
      p.line(startX, y, startX + branchLength, y);

      // blossom node
      p.noStroke();
      p.fill(240,160,195);
      p.circle(startX + branchLength, y, 10);

      // label
      p.fill(50);
      p.textSize(12);
      p.textAlign(p.LEFT);

      p.text(
        species + "  (" + count + ")",
        startX + branchLength + 12,
        y + 4
      );
    }
  }

})();