import { rankEvidence } from "./evidence-analysis.js";

const questionInput = document.querySelector("#inv-question");
const rankButton = document.querySelector("#inv-rank");
const status = document.querySelector("#inv-status");
const results = document.querySelector("#inv-results");

let investigations = [];

// the text the model compares against the question
function describeInvestigation(record) {
    return [
        record.name,
        record.safety_area,
        record.objective,
        record.fuel,
        record.conditions,
        record.measurements
    ].filter(Boolean).join(" ");
}

function showInvestigations(records) {
    results.replaceChildren();

    for (const record of records) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        const objective = document.createElement("p");
        const details = document.createElement("p");

        link.href = record.source_url;
        link.textContent = record.name + " (" + record.id + ") · " + record.safety_area;
        objective.textContent = record.objective;

        // skip fields we left blank in the json
        details.textContent = [record.fuel, record.conditions, record.measurements, record.hardware]
            .filter(Boolean).join(" | ");

        item.append(link, objective, details);
        results.append(item);
    }
}

async function rankInvestigations() {
    const question = questionInput.value.trim();
    if (!question) return;

    rankButton.disabled = true;
    status.textContent = "Ranking...";

    try {
        const ranked = await rankEvidence(investigations, question, describeInvestigation);
        showInvestigations(ranked);
        status.textContent = "Ranked by the browser model for your question.";
    } catch (error) {
        console.warn("Could not rank the investigations.", error);
        showInvestigations(investigations);
        status.textContent = "The ranking model is unavailable. Showing the default order.";
    }

    rankButton.disabled = false;
}

async function loadInvestigations() {
    try {
        const response = await fetch("./data/investigations.json");

        if (!response.ok) {
            throw new Error("Could not load investigations.json.");
        }

        investigations = await response.json();
        showInvestigations(investigations);
    } catch (error) {
        status.textContent = "Could not load the investigations.";
        console.error(error);
    }
}

rankButton.addEventListener("click", rankInvestigations);
loadInvestigations();