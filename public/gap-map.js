// evidence gap map: what the records cover, and the test that would fill each gap
const materials = ["Teflon", "Kapton", "Cotton lamp wick", "Silicone rubber"];
const environments = {
  micro: "ISS microgravity",
  moon: "Moon gravity",
  mars: "Mars gravity"
};
const statusText = {
  covered: "Detector result",
  partial: "Smoke data only",
  gap: "Not in these records"
};
// short labels so the grid fits on a phone
const shortText = { covered: "Detector result", partial: "Smoke only", gap: "Gap" };
const shortEnv = { micro: "ISS", moon: "Moon", mars: "Mars" };
const luciUrl = "https://ntrs.nasa.gov/citations/20250010653";

let evidence = [];
let particles = null;
let selected = { material: "Teflon", env: "moon" };

const dataReady = loadData();

async function loadData() {
  const [evidenceResponse, particleResponse] = await Promise.all([
    fetch("./data/evidence.json"),
    fetch("./data/particle-sizes.json")
  ]);
  if (!evidenceResponse.ok || !particleResponse.ok) throw new Error("Could not load the gap map data.");
  evidence = await evidenceResponse.json();
  particles = await particleResponse.json();
}

function detectorRecords(material) {
  return evidence.filter(record =>
    record.material === material && record.evidence_type === "detector_response");
}

function particleRow(material) {
  return particles.measurements.find(row => row.material === material);
}

// every record here comes from tests on the iss, so moon and mars are always gaps
function cellStatus(material, env) {
  if (env !== "micro") return "gap";
  if (detectorRecords(material).length) return "covered";
  if (particleRow(material)) return "partial";
  return "gap";
}

// teflon and kapton are brand names, the others read as plain words mid-sentence
function inSentence(material) {
  return /^(Teflon|Kapton)/.test(material) ? material : material.toLowerCase();
}

function link(text, url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.textContent = text;
  return anchor;
}

function paragraph(...parts) {
  const element = document.createElement("p");
  element.append(...parts);
  return element;
}

function twoLabels(long, short) {
  const full = document.createElement("span");
  const brief = document.createElement("span");
  full.className = "label-long";
  brief.className = "label-short";
  full.textContent = long;
  brief.textContent = short;
  return [full, brief];
}

function heading(text) {
  const element = document.createElement("p");
  element.className = "gap-label";
  element.textContent = text;
  return element;
}

// what the records hold for a material in iss microgravity
function microEvidence(material) {
  const items = [];
  for (const record of detectorRecords(material)) {
    items.push(paragraph(record.reported_result + " ",
      link(record.source_reference || "Section 3.2 and Figure 9", record.source_url)));
  }
  const row = particleRow(material);
  if (row) {
    items.push(paragraph("Mean smoke particle diameter: " + row.baseline + " " + particles.unit +
      " at baseline and " + row.aged + " " + particles.unit + " after " + particles.ageSeconds +
      " s of aging. ", link("SAME Final Science Report, Table 1", particles.sourceUrl)));
  }
  return items;
}

function proposedTest(material, env) {
  const status = cellStatus(material, env);
  if (env === "moon" || env === "mars") {
    const gravity = env === "moon" ? "simulated lunar gravity" : "simulated Mars gravity";
    return "Compare the same smoke detector and " + inSentence(material) + " smoke in microgravity and " + gravity +
      ". Match airflow, smoke aging time, oxygen concentration, and pressure. " +
      "Record the detector signal and whether and when it alarms.";
  }
  if (status === "partial") {
    const row = particleRow(material);
    return "Expose the ISS light-scattering detector to " + inSentence(material) + " smoke at the particle sizes SAME measured, " +
      row.baseline + " " + particles.unit + " fresh and " + row.aged + " " + particles.unit +
      " after " + particles.ageSeconds + " s, and record whether and when it alarms.";
  }
  return "Compare the ISS and Shuttle detector types with the same " + material +
    " smoke exposure, airflow, and smoke aging time. That would help isolate how the detector type affects the response.";
}

// the full write-up for one square, used by the map and by the ask tool
export function cellDetail(material, env) {
  const status = cellStatus(material, env);
  const fragment = document.createDocumentFragment();
  const title = document.createElement("h3");
  title.textContent = material + ", " + environments[env];
  fragment.append(title, paragraph(statusText[status] + "."));

  const found = microEvidence(material);
  if (env === "micro") {
    fragment.append(heading("What the records show"), ...found);
  } else {
    fragment.append(heading("Closest evidence: ISS microgravity"),
      ...(found.length ? found : [paragraph("These records have no " + inSentence(material) + " data.")]));
    if (env === "moon") {
      fragment.append(heading("Related NASA research"),
        paragraph("The Lunar Combustion Investigation studied flame spread on other materials in simulated lunar gravity. It did not test smoke detectors. ",
          link("See the LUCI flight results", luciUrl)));
    }
  }
  fragment.append(heading(status === "covered" ? "Next test" : "Proposed test to fill the gap"),
    paragraph(proposedTest(material, env)));
  return fragment;
}

function findMaterial(text) {
  if (/teflon|ptfe/.test(text)) return "Teflon";
  if (/kapton|polyimide/.test(text)) return "Kapton";
  if (/cotton|wick/.test(text)) return "Cotton lamp wick";
  if (/silicone/.test(text)) return "Silicone rubber";
  return null;
}

function findEnvironment(text) {
  if (/moon|lunar/.test(text)) return "moon";
  if (/mars|martian/.test(text)) return "mars";
  if (/\biss\b|microgravity|space station|orbit|weightless|zero g/.test(text)) return "micro";
  return null;
}

function mapLink() {
  const anchor = link("Open the evidence gap map", "#gap-title");
  anchor.className = "gap-jump";
  return paragraph(anchor);
}

// turns an insufficient-evidence answer into the closest evidence and a proposed test
export async function explainGap(question) {
  await dataReady;
  const text = question.toLowerCase();
  const material = findMaterial(text);
  const env = findEnvironment(text);
  const fragment = document.createDocumentFragment();
  const covered = materials.filter(item => cellStatus(item, "micro") === "covered");
  const partial = materials.filter(item => cellStatus(item, "micro") === "partial");
  const summary = "In ISS microgravity, these records have detector results for " + covered.join(" and ") +
    ", and smoke data only for " + partial.join(" and ").toLowerCase() + ". They have no Moon or Mars gravity tests.";

  if (material) {
    const place = env || "micro";
    fragment.append(cellDetail(material, place));
    if (!env) fragment.append(paragraph("Moon and Mars gravity: not in these records."));
  } else if (env === "micro") {
    fragment.append(paragraph(summary));
  } else if (env) {
    const title = document.createElement("h3");
    title.textContent = environments[env] + ": not in these records";
    fragment.append(title, paragraph("These records contain no " + environments[env] +
      " detector tests for any material."), heading("Closest evidence"), paragraph(summary),
      heading("Proposed test to fill the gap"), paragraph(proposedTest(covered.join(" or "), env)));
  } else {
    fragment.append(paragraph("This question is outside the detector records. " + summary));
  }
  fragment.append(mapLink());
  return fragment;
}

// when an answer cites iss records for a moon or mars question, say so plainly
export async function environmentNote(question) {
  await dataReady;
  const env = findEnvironment(question.toLowerCase());
  if (env !== "moon" && env !== "mars") return null;
  const fragment = await explainGap(question);
  const lead = paragraph("The answer above comes from tests on the ISS, not " + environments[env] + ".");
  lead.className = "gap-lead";
  fragment.prepend(lead);
  return fragment;
}

// the grid itself, only on pages that have it
function selectCell(material, env) {
  selected = { material, env };
  for (const button of document.querySelectorAll(".gap-cell")) {
    const isSelected = button.dataset.material === material && button.dataset.env === env;
    button.setAttribute("aria-pressed", String(isSelected));
  }
  document.querySelector("#gap-detail").replaceChildren(cellDetail(material, env));
}

function buildMap(table) {
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.scope = "col";
  corner.textContent = "Material";
  headRow.append(corner);
  for (const [env, label] of Object.entries(environments)) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.append(...twoLabels(label, shortEnv[env]));
    headRow.append(cell);
  }
  head.append(headRow);

  const body = document.createElement("tbody");
  for (const material of materials) {
    const row = document.createElement("tr");
    const name = document.createElement("th");
    name.scope = "row";
    name.textContent = material;
    row.append(name);
    for (const env of Object.keys(environments)) {
      const status = cellStatus(material, env);
      const cell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gap-cell " + status;
      button.dataset.material = material;
      button.dataset.env = env;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", material + ", " + environments[env] + ": " + statusText[status]);
      button.append(...twoLabels(statusText[status], shortText[status]));
      button.addEventListener("click", () => selectCell(material, env));
      cell.append(button);
      row.append(cell);
    }
    body.append(row);
  }
  table.replaceChildren(head, body);
}

async function initMap() {
  const table = document.querySelector("#gap-map");
  if (!table) return;
  const status = document.querySelector("#gap-status");
  try {
    await dataReady;
    buildMap(table);
    selectCell(selected.material, selected.env);
    status.textContent = "";
  } catch (error) {
    status.textContent = "Could not load the gap map. Check public/data/evidence.json.";
    console.error(error);
  }

}

initMap();
