import { rankEvidence } from "./evidence-analysis.js";

const questionInput = document.querySelector("#inv-question");
const rankButton = document.querySelector("#inv-rank");
const status = document.querySelector("#inv-status");
const results = document.querySelector("#inv-results");

let investigations = [];

const answerBox = document.querySelector("#inv-answer");
const answerStatus = document.querySelector("#inv-answer-status");
const answerUrl = "https://tsyauoaem6mxk5lasqdk2twyyq0stteq.lambda-url.us-east-2.on.aws/";
let answerRequest;

function renderAnswer(answer, topRecords) {
    const sources = new Map(topRecords.map(record => [record.id, record.source_url]));
    const citations = [...answer.matchAll(/\bPSI-\d+\b/g)];
    if (!citations.length || citations.some(citation => !sources.has(citation[0]))) {
        answerStatus.textContent = "No AI summary with matching NASA citations is available for this question.";
        return;
    }

    answerBox.append("AI summary from the top-ranked investigations: ");
    let cursor = 0;
    for (const citation of citations) {
        const id = citation[0];
        const link = document.createElement("a");
        link.href = sources.get(id);
        link.textContent = id;
        answerBox.append(answer.slice(cursor, citation.index), link);
        cursor = citation.index + id.length;
    }
    answerBox.append(answer.slice(cursor));
    answerBox.hidden = false;
    answerStatus.textContent = "AI summary ready.";
}

async function showAnswer(question, topRecords) {
    const request = new AbortController();
    answerRequest = request;
    const timeout = setTimeout(() => request.abort(), 30000);
    answerStatus.textContent = "Preparing an AI summary...";

    try {
        const response = await fetch(answerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, ids: topRecords.map(record => record.id) }),
            signal: request.signal
        });
        if (!response.ok) throw new Error("Could not load the AI summary.");

        const result = await response.json();
        if (answerRequest !== request) return;
        if (typeof result?.answer !== "string") throw new Error("Invalid AI summary response.");
        renderAnswer(result.answer, topRecords);
    } catch {
        if (answerRequest === request) {
            answerStatus.textContent = "The AI summary is unavailable. You can still review the ranked records below.";
        }
    } finally {
        clearTimeout(timeout);
        if (answerRequest === request) answerRequest = undefined;
    }
}

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
    // discard the previous summary as soon as a new search starts
    answerRequest?.abort();
    answerRequest = undefined;
    answerStatus.textContent = "";
    answerBox.hidden = true;
    answerBox.replaceChildren();
    status.textContent = "Ranking...";

    try {
        const ranked = await rankEvidence(investigations, question, describeInvestigation);
        showInvestigations(ranked);
        status.textContent = "Ranked by the browser model for your question.";
        showAnswer(question, ranked.slice(0, 3));
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
        rankButton.disabled = false;
    } catch (error) {
        status.textContent = "Could not load the investigations.";
        console.error(error);
    }
}

rankButton.disabled = true;
rankButton.addEventListener("click", rankInvestigations);
loadInvestigations();
