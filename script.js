let rawData = [];
let charts = {};
const YEARS = ["2017","2018","2019","2020","2021","2022","2023","2024"];

const countrySelect = document.getElementById("countrySelect");
const regionSelect = document.getElementById("regionSelect");
const yearRange = document.getElementById("yearRange");
const yearLabel = document.getElementById("yearLabel");

// ---------- LOAD CSV ----------
Papa.parse("data/internet_speeds.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: results => {
    rawData = results.data.map(d => {
      let obj = { country: d.country, major_area: d.major_area, region: d.region };
      YEARS.forEach(y => obj[y] = parseFloat(d[`year ${y}`]) || null);
      return obj;
    }).filter(d => d.country);

    populateDropdowns();
    buildCharts();
    updateAllCharts();
    initGlobe();
  },
  error: () => console.error("❌ Failed to load CSV")
});

// ---------- DROPDOWNS ----------
function populateDropdowns() {
  countrySelect.innerHTML = "";
  regionSelect.innerHTML = "<option value=''>All Regions</option>";

  const countries = rawData.map(d => d.country).sort();
  countries.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countrySelect.appendChild(opt);
  });

  const regions = [...new Set(rawData.map(d => d.region))].sort();
  regions.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    regionSelect.appendChild(opt);
  });

  countrySelect.addEventListener("change", updateAllCharts);
  regionSelect.addEventListener("change", updateAllCharts);
  yearRange.addEventListener("input", () => {
    yearLabel.textContent = `2017-${yearRange.value}`;
    updateAllCharts();
  });
}

// ---------- CHARTS ----------
function buildCharts() {
  const commonOptions = { responsive: true, plugins: { legend: { position: 'top' }, title: { display:true } } };

  charts.top = new Chart(document.getElementById("chartTop"), {
    type: "bar", data:{ labels:[], datasets:[] }, options:{...commonOptions, plugins:{title:{text:"Top Internet Speeds (2024)"}}}
  });

  charts.improved = new Chart(document.getElementById("chartImproved"), {
    type:"bar", data:{labels:[], datasets:[]}, options:{...commonOptions, plugins:{title:{text:"Most Improved Countries (2023→2024)"}}}
  });

  charts.compare = new Chart(document.getElementById("chartCompare"), {
    type:"line", data:{labels:YEARS, datasets:[]}, options:{...commonOptions, plugins:{title:{text:"Selected Countries Over Time"}}}
  });

  charts.inequality = new Chart(document.getElementById("chartInequality"), {
    type:"bar", data:{labels:[], datasets:[]}, options:{...commonOptions, plugins:{title:{text:"Digital Inequality by Region"}}}
  });

  charts.correlation = new Chart(document.getElementById("chartCorrelation"), {
    type:"scatter", data:{datasets:[]}, options:{...commonOptions, plugins:{title:{text:"Internet Speed vs Inequality"}}}
  });
}

// ---------- UPDATE CHARTS ----------
function updateAllCharts() {
  const selectedCountries = [...countrySelect.selectedOptions].map(o=>o.value);
  const selectedRegion = regionSelect.value;

  const filteredData = rawData.filter(d => (!selectedRegion || d.region === selectedRegion));

  updateTopChart(filteredData);
  updateImprovedChart(filteredData);
  updateComparisonChart(filteredData, selectedCountries);
  updateInequalityChart(filteredData);
  updateCorrelationChart(filteredData);
}

// Top speeds
function updateTopChart(data) {
  const top10 = [...data].filter(d=>d["2024"]!=null).sort((a,b)=>b["2024"]-a["2024"]).slice(0,10);
  charts.top.data.labels = top10.map(d=>d.country);
  charts.top.data.datasets = [{label:"Mbps (2024)", data:top10.map(d=>d["2024"]), backgroundColor:'#0ea5e9'}];
  charts.top.update();
}

// Most improved
function updateImprovedChart(data) {
  const improvements = data.map(d=>({country:d.country, change:(d["2024"]||0)-(d["2023"]||0)}))
    .sort((a,b)=>b.change-a.change).slice(0,10);
  charts.improved.data.labels = improvements.map(d=>d.country);
  charts.improved.data.datasets = [{label:"Mbps Increase", data:improvements.map(d=>d.change), backgroundColor:'#f97316'}];
  charts.improved.update();
}

// Comparison chart
function updateComparisonChart(data, selectedCountries) {
  charts.compare.data.datasets = selectedCountries.map(c=>{
    const d = data.find(r=>r.country===c);
    return {label:c, data:YEARS.map(y=>d[y]||0), borderWidth:2, tension:0.3};
  });
  charts.compare.update();
}

// Inequality chart
function updateInequalityChart(data) {
  const regions = {};
  data.forEach(d=>{ if(!regions[d.region]) regions[d.region]=[]; regions[d.region].push(d["2024"]||0); });
  const labels = Object.keys(regions);
  const values = labels.map(r=>Math.max(...regions[r])-Math.min(...regions[r]));
  charts.inequality.data.labels = labels;
  charts.inequality.data.datasets = [{label:"DII", data:values, backgroundColor:'#22c55e'}];
  charts.inequality.update();
}

// Correlation chart
function updateCorrelationChart(data) {
  const points = data.map(d=>{
    const speed = d["2024"]||0;
    const inequality = Math.max(...YEARS.map(y=>d[y]||0))-Math.min(...YEARS.map(y=>d[y]||0));
    return {x:speed, y:inequality, label:d.country};
  });
  charts.correlation.data.datasets = [{label:"Countries", data:points, backgroundColor:'#6366f1'}];
  charts.correlation.update();
}

// ---------- 3D Globe ----------
function initGlobe() {
  const container = document.getElementById("globeContainer");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 1000);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const globeGeo = new THREE.SphereGeometry(1, 64, 64);
  const globeMat = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load("https://threejs.org/examples/textures/earth_atmos_2048.jpg"),
    roughness:1,
    metalness:0
  });
  const globe = new THREE.Mesh(globeGeo, globeMat);
  scene.add(globe);

  const ambientLight = new THREE.AmbientLight(0xffffff,0.6);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff,1);
  pointLight.position.set(5,3,5);
  scene.add(pointLight);

  function animate() {
    requestAnimationFrame(animate);
    globe.rotation.y += 0.0015;
    renderer.render(scene,camera);
  }
  animate();
}
