import { explainGap, environmentNote } from "./gap-map.js?v=4";

const askInput = document.querySelector("#ask-question");
const askButton = document.querySelector("#ask-button");
const askStatus = document.querySelector("#ask-status");
const askAnswer = document.querySelector("#ask-answer");
const askSources = document.querySelector("#ask-sources");
const askGap = document.querySelector("#ask-gap");
const askUrl = "https://tsyauoaem6mxk5lasqdk2twyyq0stteq.lambda-url.us-east-2.on.aws/";

let evidence = [];

function showSources(ids) {
    askSources.replaceChildren();

    for (const id of ids) {
        const record = evidence.find(item => item.id === id);
        if (!record) continue;

        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = record.source_url;
        link.textContent = record.material + ": " + (record.source_reference || record.id);

        const limit = document.createElement("p");
        limit.textContent = "Limit: " + record.limitation;

        item.append(link, limit);
        askSources.append(item);
    }
}

async function askEvidence() {
    const question = askInput.value.trim();
    if (!question) return;

    askButton.disabled = true;
    askAnswer.hidden = true;
    askSources.replaceChildren();
    askGap.hidden = true;
    askGap.replaceChildren();
    askStatus.textContent = "Reading the detector evidence...";

    try {
        const response = await fetch(askUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "evidence", question })
        });
        if (!response.ok) throw new Error("status " + response.status);

        const result = await response.json();

        if (result.gap || !result.answer) {
            // a real evidence gap, not a broken service
            askStatus.textContent = "Insufficient evidence: these NASA records do not answer that question.";
            // say which square is missing and what test would fill it
            try {
                askGap.replaceChildren(await explainGap(question));
                askGap.hidden = false;
            } catch (error) {
                console.warn("Could not explain the gap.", error);
            }
        } else {
            // swap [record-id] tags for plain numbers so the answer reads cleanly
            let text = result.answer;
            result.ids.forEach((id, index) => {
                text = text.replaceAll("[" + id + "]", "[" + (index + 1) + "]");
            });
            askAnswer.textContent = "AI summary of the detector records: " + text;
            askAnswer.hidden = false;
            askStatus.textContent = "Numbers in the answer match the sources listed below.";
            showSources(result.ids);
            try {
                const note = await environmentNote(question);
                if (note) {
                    askGap.replaceChildren(note);
                    askGap.hidden = false;
                }
            } catch (error) {
                console.warn("Could not check the environment.", error);
            }
        }
    } catch (error) {
        console.warn("Could not reach the summary service.", error);
        askStatus.textContent = "The AI service is unavailable right now. The evidence cards above still work.";
    }

    askButton.disabled = false;
}

async function loadAskEvidence() {
    try {
        const response = await fetch("./data/evidence.json");
        evidence = await response.json();
    } catch (error) {
        console.error(error);
    }
}

askButton.addEventListener("click", askEvidence);
askInput.addEventListener("keydown", event => {
    // enter asks the question like the button
    if (event.key === "Enter" && !askButton.disabled) askEvidence();
});
loadAskEvidence();
