// example answers shown in the hero window
const scenes = {
  kapton: {
    question: "Did the ISS detector catch Kapton smoke?",
    answer: "The ISS light-scattering detector would have stayed below its alarm threshold in over half of the reported Kapton smoke tests [1].",
    source: "SAME detector study, Figure 9",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7918997/#F9",
    note: "Under the conditions studied."
  },
  teflon: {
    question: "How did the ISS and Shuttle detectors compare for Teflon smoke?",
    answer: "In SAME Test 25, the Shuttle detector showed a strong signal while the ISS detector signal was more erratic [1].",
    source: "SAME Final Science Report, Figure 12",
    url: "https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=904707#page=24",
    note: "A single test. It does not establish a comparative alarm rate."
  },
  moon: {
    question: "How does the detector respond at Moon gravity?",
    answer: "Insufficient evidence: these records contain no lunar-gravity detector tests. Proposed follow-up: compare the same detector and material in microgravity and simulated lunar gravity.",
    source: "LUCI flight results",
    url: "https://ntrs.nasa.gov/citations/20250010653",
    note: "Related NASA research on lunar-gravity flammability, not detectors."
  }
};

const chips = document.querySelectorAll(".scene-chip");
const question = document.querySelector("#scene-question");
const answerText = document.querySelector("#scene-answer-text");
const answerSource = document.querySelector("#scene-answer-source");

function showScene(name) {
  const scene = scenes[name];
  question.textContent = scene.question;
  answerText.textContent = scene.answer;

  const link = document.createElement("a");
  link.href = scene.url;
  link.textContent = scene.source;
  answerSource.replaceChildren(name === "moon" ? "Related: " : "[1] ", link, ". " + scene.note);

  for (const chip of chips) {
    chip.setAttribute("aria-pressed", String(chip.dataset.scene === name));
  }
}

for (const chip of chips) {
  chip.addEventListener("click", () => showScene(chip.dataset.scene));
}

// the how it works tabs, with arrow keys like a normal tab list
const tabs = [...document.querySelectorAll(".steps [role=tab]")];

function selectTab(tab, focus) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute("aria-selected", String(selected));
    other.tabIndex = selected ? 0 : -1;
    document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
  }
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab, false));
  tab.addEventListener("keydown", event => {
    const moves = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next;
    if (event.key in moves) next = (index + moves[event.key] + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });
});
