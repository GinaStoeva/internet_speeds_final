// ---------- CONFIG ----------
const YEARS = ["2017","2018","2019","2020","2021","2022","2023","2024"];
let rawData = [];
let charts = {};
const countrySelect = document.getElementById("countrySelect");
const regionSelect = document.getElementById("regionSelect");
const yearRange = document.getElementById("yearRange");
const yearLabel = document.getElementById("yearLabel");

// ---------- LOAD CSV ----------
Papa.parse("internet_speeds.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    rawData = results.data.map(d=>{
      let obj = { country:d.country, region:d.region, major_area:d.major_area };
      YEARS.forEach(y=> obj[y] = parseFloat(d[`year ${y}`]) || null);
      return obj;
    }).filter(d=>d.country);

    initControls();
    buildCharts();
    updateAllCharts();
  }
});

// ---------- CONTROLS ----------
function initControls() {
  // Countries dropdown
  countrySelect.innerHTML = "";
  rawData.map(d=>d.country).sort().forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    countrySelect.appendChild(opt);
  });
  
  // Regions dropdown
  let regions = [...new Set(rawData.map(d=>d.region))].sort();
  regions.forEach(r=>{
    const opt = document.createElement("option");
    opt.value = r; opt.textContent = r;
    regionSelect.appendChild(opt);
  });

  countrySelect.addEventListener("change", updateAllCharts);
  regionSelect.addEventListener("change", updateAllCharts);
  yearRange.addEventListener("input", ()=>{
    yearLabel.textContent = yearRange.value;
    updateAllCharts();
  });
}

// ---------- CHARTS ----------
function buildCharts() {
  const commonOpts = { responsive:true, plugins:{ legend:{ labels:{ color:'#f8fafc' } } } };

  charts.topChart = new Chart(document.getElementById("topChart"), {
    type:"bar",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOpts, plugins:{ title:{ display:true, text:"🌟 Top 10 Countries by Speed", color:'#f8fafc', font:{ size:20 } } } }
  });

  charts.trendChart = new Chart(document.getElementById("trendChart"), {
    type:"line",
    data:{ labels:YEARS, datasets:[] },
    options:{ ...commonOpts, plugins:{ title:{ display:true, text:"📈 Country Trend Over Years", color:'#f8fafc', font:{ size:20 } } }, interaction:{ mode:'nearest', intersect:false }, elements:{ line:{ tension:0.3, borderWidth:3 } } }
  });

  charts.improvedChart = new Chart(document.getElementById("improvedChart"), {
    type:"bar",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOpts, indexAxis:'y', plugins:{ title:{ display:true, text:"🚀 Most Improved Countries (2023→2024)", color:'#f8fafc', font:{ size:20 } } } }
  });

  charts.inequalityChart = new Chart(document.getElementById("inequalityChart"), {
    type:"bar",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOpts, plugins:{ title:{ display:true, text:"⚖️ Regional Digital Inequality", color:'#f8fafc', font:{ size:20 } } } }
  });

  charts.scatterChart = new Chart(document.getElementById("scatterChart"), {
    type:"scatter",
    data:{ datasets:[] },
    options:{ ...commonOpts, plugins:{ title:{ display:true, text:"📊 Speed vs Improvement", color:'#f8fafc', font:{ size:20 } } }, scales:{ x:{ title:{ display:true, text:"Speed (Mbps)" } }, y:{ title:{ display:true, text:"Improvement (Mbps)" } } } }
  });

  charts.averageChart = new Chart(document.getElementById("averageChart"), {
    type:"line",
    data:{ labels:YEARS, datasets:[] },
    options:{ ...commonOpts, plugins:{ title:{ display:true, text:"🌍 Global Average Speeds Over Years", color:'#f8fafc', font:{ size:20 } } }, elements:{ line:{ tension:0.3, borderWidth:3 } } }
  });

  charts.regionChart = new Chart(document.getElementById("regionChart"), {
    type:"bar",
    data:{ labels:[], datasets:[] },
    options:{ ...commonOpts, plugins:{ title:{ display:true, text:"📊 Region Comparison Over Years", color:'#f8fafc', font:{ size:20 } } }, scales:{ x:{ stacked:true }, y:{ stacked:true } } }
  });
}

// ---------- UPDATE CHARTS ----------
function updateAllCharts() {
  const selectedCountries = [...countrySelect.selectedOptions].map(o=>o.value);
  const selectedRegion = regionSelect.value;
  const year = yearRange.value;

  const filteredData = rawData.filter(d=> (selectedRegion==='All' || d.region===selectedRegion) );

  // Top 10 chart
  const top10 = [...filteredData].filter(d=>d[year]!=null).sort((a,b)=>b[year]-a[year]).slice(0,10);
  charts.topChart.data.labels = top10.map(d=>d.country);
  charts.topChart.data.datasets = [{ label:`Speed (Mbps) ${year}`, data:top10.map(d=>d[year]), backgroundColor:'#0ea5e9' }];
  charts.topChart.update();

  // Trend chart
  let datasetsTrend = [];
  if(selectedCountries.length>0){
    datasetsTrend = selectedCountries.map(c=>{
      const row = rawData.find(r=>r.country===c);
      return { label:c, data:YEARS.map(y=>row[y]||null), borderColor:getRandomColor(), fill:false };
    });
  }
  charts.trendChart.data.datasets = datasetsTrend;
  charts.trendChart.update();

  // Improved chart
  const improved = filteredData.map(d=>({ country:d.country, change:(d["2024"]||0)-(d["2023"]||0) }))
                               .sort((a,b)=>b.change-a.change).slice(0,10);
  charts.improvedChart.data.labels = improved.map(d=>d.country);
  charts.improvedChart.data.datasets = [{ label:"Mbps Increase", data:improved.map(d=>d.change), backgroundColor:'#f97316' }];
  charts.improvedChart.update();

  // Inequality chart
  const regions = {};
  filteredData.forEach(d=>{
    if(!regions[d.region]) regions[d.region]=[];
    regions[d.region].push(d[year]||0);
  });
  const labels = Object.keys(regions);
  const values = labels.map(r=> Math.max(...regions[r])-Math.min(...regions[r]) );
  charts.inequalityChart.data.labels = labels;
  charts.inequalityChart.data.datasets = [{ label:"DII (Mbps)", data:values, backgroundColor:'#22c55e' }];
  charts.inequalityChart.update();

  // Scatter chart
  const scatterPoints = filteredData.map(d=>{
    const speed = d[year]||0;
    const improvement = ((d[year]||0)-(d[parseInt(year)-1]||0))||0;
    return { x:speed, y:improvement, label:d.country };
  });
  charts.scatterChart.data.datasets = [{ label:"Country", data:scatterPoints, backgroundColor:'#6366f1' }];
  charts.scatterChart.update();

  // Average chart
  const averages = YEARS.map(y=>{
    const vals = filteredData.map(d=>d[y]).filter(v=>v!=null);
    return vals.length>0 ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  });
  charts.averageChart.data.datasets = [{ label:"Global Average Mbps", data:averages, borderColor:'#f43f5e', fill:true, backgroundColor:'rgba(244,63,94,0.2)' }];
  charts.averageChart.update();

  // Region chart stacked
  const regionLabels = [...new Set(filteredData.map(d=>d.region))];
  const datasetsRegion = YEARS.map(y=>{
    return {
      label:y,
      data:regionLabels.map(r=>{
        const vals = filteredData.filter(d=>d.region===r).map(d=>d[y]||0);
        return vals.reduce((a,b)=>a+b,0);
      }),
      backgroundColor:getRandomColor(0.7)
    };
  });
  charts.regionChart.data.labels = regionLabels;
  charts.regionChart.data.datasets = datasetsRegion;
  charts.regionChart.update();
}

// ---------- HELPER ----------
function getRandomColor(alpha=1){
  const r = Math.floor(Math.random()*200)+30;
  const g = Math.floor(Math.random()*200)+30;
  const b = Math.floor(Math.random()*200)+30;
  return `rgba(${r},${g},${b},${alpha})`;
}
