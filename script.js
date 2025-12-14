let rawData = [];
let charts = {};
const YEARS = ["2017","2018","2019","2020","2021","2022","2023","2024"];

const countrySelect = document.getElementById("countrySelect");
const yearRange = document.getElementById("yearRange");
const yearLabel = document.getElementById("yearLabel");
const topNInput = document.getElementById("topN");
const updateBtn = document.getElementById("updateCharts");

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

    buildDropdown();
    buildCharts();
    updateAllCharts();
  }
});

// ---------- DROPDOWN ----------
function buildDropdown() {
  countrySelect.innerHTML = "";
  rawData.map(d=>d.country).sort().forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countrySelect.appendChild(opt);
  });
}

// ---------- CHARTS ----------
function buildCharts() {
  const commonOptions = { responsive:true, plugins:{ legend:{ position:'top' } } };

  charts.compare = new Chart(document.getElementById("chartCompare"), {
    type:"line",
    data:{ labels:YEARS, datasets:[] },
    options:{ ...commonOptions, plugins:{ title:{ display:true, text:"Country Internet Speeds Over Time" } } }
  });

  charts.top = new Chart(document.getElementById("chartTop"), {
    type:"bar",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOptions, plugins:{ title:{ display:true, text:"Top N Fastest Countries (Selected Year)" } } }
  });

  charts.improved = new Chart(document.getElementById("chartImproved"), {
    type:"bar",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOptions, plugins:{ title:{ display:true, text:"Most Improved Countries (2023→2024)" } } }
  });

  charts.inequality = new Chart(document.getElementById("chartInequality"), {
    type:"bar",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOptions, plugins:{ title:{ display:true, text:"Digital Inequality by Region" } } }
  });

  charts.correlation = new Chart(document.getElementById("chartCorrelation"), {
    type:"scatter",
    data:{ datasets:[] },
    options:{ ...commonOptions, plugins:{ title:{ display:true, text:"Speed vs Inequality" } } }
  });

  charts.distribution = new Chart(document.getElementById("chartDistribution"), {
    type:"doughnut",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOptions, plugins:{ title:{ display:true, text:"Distribution of Speeds (Selected Year)" } } }
  });
}

// ---------- UPDATE CHARTS ----------
function updateAllCharts() {
  updateComparisonChart();
  updateTopChart();
  updateImprovedChart();
  updateInequalityChart();
  updateCorrelationChart();
  updateDistributionChart();
}

// Line chart: compare countries
function updateComparisonChart() {
  const selected = [...countrySelect.selectedOptions].map(o=>o.value);
  charts.compare.data.datasets = selected.map(country=>{
    const row = rawData.find(d=>d.country===country);
    return { label:country, data:YEARS.map(y=>row[y]||0), borderWidth:2, tension:0.3 };
  });
  charts.compare.update();
}

// Top N chart
function updateTopChart() {
  const year = yearRange.value;
  const N = parseInt(topNInput.value) || 10;
  const top = [...rawData].filter(r=>r[year]!=null).sort((a,b)=>b[year]-a[year]).slice(0,N);
  charts.top.data.labels = top.map(d=>d.country);
  charts.top.data.datasets = [{ label:`Mbps (${year})`, data:top.map(d=>d[year]), backgroundColor:'#0ea5e9' }];
  charts.top.update();
}

// Most improved
function updateImprovedChart() {
  const improvements = rawData.map(r=>({ country:r.country, change:(r["2024"]||0)-(r["2023"]||0) }))
    .sort((a,b)=>b.change-a.change).slice(0,10);
  charts.improved.data.labels = improvements.map(d=>d.country);
  charts.improved.data.datasets = [{ label:"Mbps Increase", data:improvements.map(d=>d.change), backgroundColor:'#f97316' }];
  charts.improved.update();
}

// Digital inequality
function updateInequalityChart() {
  const regions = {};
  rawData.forEach(r=>{
    if(!regions[r.region]) regions[r.region]=[];
    regions[r.region].push(r["2024"]||0);
  });
  const labels = Object.keys(regions);
  const values = labels.map(region=>Math.max(...regions[region])-Math.min(...regions[region]));
  charts.inequality.data.labels = labels;
  charts.inequality.data.datasets = [{ label:"DII (Mbps)", data:values, backgroundColor:'#22c55e' }];
  charts.inequality.update();
}

// Speed vs inequality correlation
function updateCorrelationChart() {
  const points = [];
  rawData.forEach(r=>{
    const speed = r["2024"]||0;
    const inequality = (Math.max(...YEARS.map(y=>r[y]||0))-Math.min(...YEARS.map(y=>r[y]||0)))||0;
    points.push({ x:speed, y:inequality, label:r.country });
  });
  charts.correlation.data.datasets = [{ label:"Country", data:points, backgroundColor:'#6366f1' }];
  charts.correlation.update();
}

// Distribution pie/doughnut
function updateDistributionChart() {
  const year = yearRange.value;
  const bins = { "<10":0, "10-50":0, "50-100":0, "100-200":0, ">200":0 };
  rawData.forEach(r=>{
    const val = r[year]||0;
    if(val<10) bins["<10"]++;
    else if(val<50) bins["10-50"]++;
    else if(val<100) bins["50-100"]++;
    else if(val<200) bins["100-200"]++;
    else bins[">200"]++;
  });
  charts.distribution.data.labels = Object.keys(bins);
  charts.distribution.data.datasets = [{ data:Object.values(bins), backgroundColor:['#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6'] }];
  charts.distribution.update();
}

// ---------- EVENTS ----------
yearRange.addEventListener("input", ()=>{ yearLabel.textContent = yearRange.value; updateAllCharts(); });
updateBtn.addEventListener("click", updateAllCharts);
countrySelect.addEventListener("change", updateAllCharts);
topNInput.addEventListener("change", updateAllCharts);
