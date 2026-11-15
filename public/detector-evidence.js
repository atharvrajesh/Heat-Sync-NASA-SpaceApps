import { downloadCsv } from "./csv.js?v=4";

const materialSelect = document.querySelector("#material");
const status = document.querySelector("#status");
const detectorCard = document.querySelector("#detector-card");
const testCard = document.querySelector("#test-card");
const downloadButton = document.querySelector("#download-csv");
const selectedMaterial = document.querySelector("#selected-material");
const conditionsRow = document.querySelector("#detector-conditions-row");
let visibleRecords = [];

function showEvidence(records) {
  const material = materialSelect.value;
  selectedMaterial.textContent = material;

  const detector = records.find(record =>
    record.material === material &&
    record.evidence_type === "detector_response"
  );

  const test = records.find(record =>
    record.material === material &&
    record.evidence_type === "test_conditions"
  );

  visibleRecords = [detector, test].filter(Boolean);
  downloadButton.disabled = visibleRecords.length === 0;

  detectorCard.hidden = !detector;
  testCard.hidden = !test;
  status.textContent = "";

  if (detector) {
    document.querySelector("#detector-material").textContent = material;
    document.querySelector("#detector-name").textContent = detector.detector;
    document.querySelector("#detector-result").textContent = detector.reported_result;
    document.querySelector("#detector-limit").textContent = detector.limitation;
    document.querySelector("#detector-source").href = detector.source_url;
    // some detector records also describe the test setup
    document.querySelector("#detector-conditions").textContent = detector.conditions || "";
    conditionsRow.hidden = !detector.conditions;
    status.textContent = "Showing evidence for " + material + ".";
  } else {
    status.textContent = "No detector finding is available for " + material + ".";
  }

  if (test) {
    document.querySelector("#test-conditions").textContent = test.conditions;
    document.querySelector("#test-limit").textContent = test.limitation;
    document.querySelector("#test-source").href = test.source_url;
  }
}

function downloadDetectorCsv(records, material) {
  const columns = [
    ["Material", "material"],
    ["Evidence type", "evidence_type"],
    ["Finding", "reported_result"],
    ["Test conditions", "conditions"],
    ["Limitation", "limitation"],
    ["Source URL", "source_url"]
  ];

  const header = columns.map(column => column[0]);
  const rows = records.map(record =>
    columns.map(column => record[column[1]])
  );
  downloadCsv([header, ...rows], "silent-alarm-" + material.toLowerCase() + ".csv");
}

downloadButton.addEventListener("click", () => {
  downloadDetectorCsv(visibleRecords, materialSelect.value);
});

async function loadEvidence() {
  try {
    const response = await fetch("./data/evidence.json");

    if (!response.ok) {
      throw new Error("Could not load evidence.json.");
    }

    const records = await response.json();

    if (!Array.isArray(records)) {
      throw new Error("Expected a list of evidence records.");
    }

    showEvidence(records);
    materialSelect.addEventListener("change", () => showEvidence(records));
    materialSelect.disabled = false;
  } catch (error) {
    status.textContent = "Could not load the evidence. Check public/data/evidence.json.";
    console.error(error);
  }
}

loadEvidence();
