// viz_cherry_species.js
// cherry blossom species visualization

let sdotTable;
let uwTable;

let speciesCounts = {};
let speciesList = [];

function preload(){

  sdotTable = loadTable(
    "SDOT_Trees_data.csv",
    "csv",
    "header"
  );

  uwTable = loadTable(
    "Maust_et_al_data/blossom_dates.csv",
    "csv",
    "header"
  );

}

function setup(){

  createCanvas(700,700);
  angleMode(RADIANS);
  textFont("sans-serif");

  processSDOT();
  processUW();

  speciesList = Object.keys(speciesCounts);

}

function processSDOT(){

  for(let i=0;i<sdotTable.getRowCount();i++){

    const genus = sdotTable.getString(i,"GENUS");
    const common = (sdotTable.getString(i,"COMMON_NAME")||"").toLowerCase();

    if(genus === "Prunus" && common.includes("cherry")){

      let species = sdotTable.getString(i,"SCIENTIFIC_NAME");

      if(!species){
        species = common;
      }

      if(!speciesCounts[species]){
        speciesCounts[species] = 0;
      }

      speciesCounts[species]++;

    }
  }
}

function processUW(){

  let seenSpecies = {};

  for(let i=0;i<uwTable.getRowCount();i++){

    let plant = uwTable.getString(i,"PLANT");

    let match = plant.match(/\((.*?)\)/);

    if(match){

      let species = match[1];

      if(!seenSpecies[species]){

        seenSpecies[species] = true;

        if(!speciesCounts[species]){
          speciesCounts[species] = 0;
        }

        speciesCounts[species] += 30; 
        // approximate UW Quad grove size
      }
    }
  }
}

function draw(){

  background(252,248,250);

  translate(width/2,height/2);

  drawRoot();
  drawBranches();

}

function drawRoot(){

  fill(120,80,100);
  noStroke();
  circle(0,0,40);

  fill(40);
  textAlign(CENTER);
  textSize(16);
  text("Prunus",0,5);

}

function drawBranches(){

  let radius = 200;

  let maxCount = max(Object.values(speciesCounts));

  for(let i=0;i<speciesList.length;i++){

    let species = speciesList[i];
    let count = speciesCounts[species];

    let angle = map(
      i,
      0,
      speciesList.length,
      0,
      TWO_PI
    );

    let x = cos(angle)*radius;
    let y = sin(angle)*radius;

    stroke(170,140,150);
    strokeWeight(map(count,0,maxCount,1,6));
    line(0,0,x,y);

    drawBlossomCluster(x,y,count,maxCount);

    noStroke();
    fill(50);
    textSize(11);
    textAlign(CENTER);

    push();
    translate(x*1.15,y*1.15);
    rotate(angle);
    text(species,0,0);
    pop();

  }

}

function drawBlossomCluster(x,y,count,maxCount){

  let petals = map(count,0,maxCount,3,20);

  for(let i=0;i<petals;i++){

    let angle = random(TWO_PI);
    let r = random(12);

    let px = x + cos(angle)*r;
    let py = y + sin(angle)*r;

    fill(240,160,195,200);
    noStroke();
    circle(px,py,6);

  }

}