// shared ranker, plus the explore tool when its controls are on the page
let records = [];
let modelPromise;
let analysisRun = 0;
let controls;

export function setAnalysisEvidence(evidence) {
  records = evidence;
  if (controls) controls.analyzeButton.disabled = records.length === 0;
}

function clearAnalysis() {
  const { results, followUp, moonContext, status, analyzeButton } = controls;
  analysisRun += 1;
  results.replaceChildren();
  followUp.hidden = true;
  moonContext.hidden = true;
  status.textContent = "";
  analyzeButton.disabled = records.length === 0;
}

function loadModel() {
  // reuse the model across questions, and allow a retry if the download fails
  modelPromise ??= import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1")
    .then(({ env, pipeline }) => {
      env.allowLocalModels = false;
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        device: "wasm",
        dtype: "q8",
        revision: "751bff37182d3f1213fa05d7196b954e230abad9"
      });
    })
    .catch(error => {
      modelPromise = undefined;
      throw error;
    });
  return modelPromise;
}

// default text for the evidence cards
function describeEvidence(record) {
  return [record.material, record.detector, record.reported_result, record.conditions]
    .filter(Boolean).join(" ");
}

export async function rankEvidence(candidates, question, describe = describeEvidence) {
  const model = await loadModel();
  const descriptions = candidates.map(describe);
  const embeddings = await model([question, ...descriptions], {
    pooling: "mean",
    normalize: true
  });
  const [questionVector, ...recordVectors] = embeddings.tolist();

  // the vectors are normalized, so the dot product gives cosine similarity
  return candidates
    .map((record, index) => ({
      record,
      score: questionVector.reduce((sum, value, position) =>
        sum + value * recordVectors[index][position], 0)
    }))
    .sort((first, second) => second.score - first.score)
    .map(item => item.record);
}

function showRecord(record, isDirectEvidence) {
  const item = document.createElement("li");
  const title = document.createElement("strong");
  const finding = document.createElement("p");
  const limitation = document.createElement("p");
  const source = document.createElement("a");

  title.textContent = isDirectEvidence ? "Direct evidence" : "Related evidence";
  finding.textContent = record.reported_result;
  limitation.textContent = record.limitation;
  source.href = record.source_url;
  source.textContent = record.source_reference || "Section 3.2 and Figure 9";
  item.append(title, finding, limitation, source);
  controls.results.append(item);
}

async function analyzeEvidence() {
  clearAnalysis();
  const { materialSelect, questionSelect, environmentSelect, analyzeButton, status, moonContext, followUp } = controls;
  const currentRun = analysisRun;
  const material = materialSelect.value;
  const questionType = questionSelect.value;
  const compareDetectors = questionType === "compare_detectors";

  if (environmentSelect.value === "moon") {
    status.textContent = "These records contain no lunar-gravity detector tests for " + material + ".";
    moonContext.hidden = false;
    return;
  }

  const matchingRecords = records.filter(record => record.material === material);
  const isDirectEvidence = compareDetectors
    ? record => record.id === "same-teflon-test-25"
    : record => record.evidence_type === questionType;
  const directRecords = matchingRecords.filter(isDirectEvidence);
  if (directRecords.length === 0) {
    status.textContent = compareDetectors
      ? "These records do not include a direct comparison of both detectors for " + material + "."
      : "The current records for " + material + " do not cover that question.";
    return;
  }

  const relatedRecords = matchingRecords.filter(record => !isDirectEvidence(record));
  let question = "What airflow, material loss, and smoke aging conditions were reported for " + material + "?";
  if (compareDetectors) {
    question = "Compare the ISS and Space Shuttle detector signals in SAME Teflon Test 25.";
  } else if (questionType === "detector_response") {
    question = "Did the ISS light-scattering detector stay below the alarm threshold in reported " + material + " smoke tests?";
  }

  analyzeButton.disabled = true;
  status.textContent = modelPromise ? "Checking relevance..." : "Loading the ranking model...";

  let rankedRecords;
  let rankingStatus;
  try {
    const rankedBySimilarity = await rankEvidence(matchingRecords, question);
    // direct test results belong above background records, even with a lower score
    rankedRecords = [
      ...rankedBySimilarity.filter(isDirectEvidence),
      ...rankedBySimilarity.filter(record => !isDirectEvidence(record))
    ];
    rankingStatus = "Ranked with the browser model. Direct evidence appears first.";
  } catch (error) {
    console.warn("Could not run the ranking model.", error);
    rankedRecords = [...directRecords, ...relatedRecords];
    rankingStatus = "The ranking model is unavailable. Showing direct evidence first.";
  }

  // the user may have changed a selection while the model was loading
  if (currentRun !== analysisRun) return;
  status.textContent = rankingStatus;
  rankedRecords.forEach(record => showRecord(record, isDirectEvidence(record)));
  followUp.hidden = material !== "Teflon" ||
    (!compareDetectors && questionType !== "detector_response");
  analyzeButton.disabled = false;
}

async function loadAnalysisEvidence() {
  try {
    const response = await fetch("./data/evidence.json");
    if (!response.ok) throw new Error("Could not load evidence.json.");
    const evidence = await response.json();
    if (!Array.isArray(evidence)) throw new Error("Expected a list of evidence records.");
    setAnalysisEvidence(evidence);
  } catch (error) {
    controls.status.textContent = "Could not load the evidence. Check public/data/evidence.json.";
    console.error(error);
  }
}

// only wire up the explore tool on pages that have it
function initAnalysis() {
  const analyzeButton = document.querySelector("#analyze");
  if (!analyzeButton) return;

  controls = {
    analyzeButton,
    materialSelect: document.querySelector("#analysis-material") || document.querySelector("#material"),
    questionSelect: document.querySelector("#analysis-question"),
    environmentSelect: document.querySelector("#analysis-environment"),
    status: document.querySelector("#analysis-status"),
    results: document.querySelector("#analysis-results"),
    followUp: document.querySelector("#follow-up-test"),
    moonContext: document.querySelector("#moon-context")
  };

  for (const select of [controls.materialSelect, controls.questionSelect, controls.environmentSelect]) {
    select.addEventListener("change", clearAnalysis);
  }
  analyzeButton.addEventListener("click", analyzeEvidence);
  analyzeButton.disabled = records.length === 0;
  if (records.length === 0) loadAnalysisEvidence();
}

initAnalysis();
