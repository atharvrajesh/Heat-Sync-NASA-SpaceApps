import { downloadCsv } from "./csv.js?v=4";

const chart = document.querySelector("#particle-chart");
const status = document.querySelector("#particle-status");
const button = document.querySelector("#download-particle-csv");
const axisMax = 450;

function particleBar(label, diameter, unit, aged) {
  const bar = document.createElement("div");
  bar.className = aged ? "particle-bar aged" : "particle-bar";

  const name = document.createElement("span");
  name.textContent = label;

  const track = document.createElement("span");
  track.className = "particle-track";
  track.setAttribute("aria-hidden", "true");

  const fill = document.createElement("span");
  fill.style.width = (diameter / axisMax) * 100 + "%";
  track.append(fill);

  const value = document.createElement("span");
  value.textContent = diameter + " " + unit;
  bar.append(name, track, value);
  return bar;
}

function showParticleSizes(data) {
  const rows = [["Material", "Condition", "Aging time (s)", "Arithmetic mean diameter",
    "Diameter unit", "Method", "Source", "Source URL"]];

  for (const { material, baseline, aged } of data.measurements) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = material;
    item.append(name, particleBar("Baseline", baseline, data.unit, false),
      particleBar("Aged " + data.ageSeconds + " s", aged, data.unit, true));
    chart.append(item);

    const source = [data.unit, data.method, data.sourceReference, data.sourceUrl];
    rows.push([material, "Baseline (no aging)", "", baseline, ...source]);
    rows.push([material, "Aged", data.ageSeconds, aged, ...source]);
  }

  button.addEventListener("click", () => downloadCsv(rows, "silent-alarm-particle-sizes.csv"));
  button.disabled = false;
}

async function loadParticleSizes() {
  try {
    const response = await fetch("./data/particle-sizes.json");
    if (!response.ok) throw new Error("Could not load particle-sizes.json.");
    showParticleSizes(await response.json());
  } catch (error) {
    status.textContent = "Could not load the chart. The report below has the original values.";
    console.error(error);
  }
}

loadParticleSizes();
