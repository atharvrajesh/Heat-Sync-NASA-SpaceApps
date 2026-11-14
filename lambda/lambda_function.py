import base64
import json
import os
import re
import urllib.request

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"
DATA_URL = "https://main.d10dgoqf0gsajx.amplifyapp.com/data/investigations.json"
EVIDENCE_URL = "https://main.d10dgoqf0gsajx.amplifyapp.com/data/evidence.json"

INSTRUCTIONS = (
    "You help spacecraft fire-safety researchers. Answer the question using only "
    "the NASA investigation records provided. Write at most three sentences. "
    "End every sentence with the record id it came from in parentheses, like (PSI-102). "
    "Stay close to the wording of the records. Do not add numbers, names, effects, "
    "or facts that are not in the records. "
    "Only describe the records that help answer the question, and skip the rest. "
    "Never say what other records contain or lack."
)

EVIDENCE_INSTRUCTIONS = (
    "You help spacecraft fire-safety researchers read smoke detector evidence. "
    "Answer the question using only the evidence records provided. Write at most three sentences. "
    "End every sentence with the id of the record it came from in square brackets, like [teflon-iss-alarm]. "
    "Stay close to the wording of the records and keep each record's limitation in mind. "
    "Do not add numbers, names, effects, or facts that are not in the records. "
    "If the records do not answer the question, reply only with: NO_EVIDENCE"
)

records_by_id = None
evidence_by_id = None


def load_records():
    # fetched once per warm lambda, so the site stays the single source of truth
    global records_by_id
    if records_by_id is None:
        request = urllib.request.Request(DATA_URL, headers={"User-Agent": "alarm-gap"})
        with urllib.request.urlopen(request, timeout=10) as response:
            records = json.load(response)
        records_by_id = {record["id"]: record for record in records}
    return records_by_id


def load_evidence():
    # same idea as load_records, for the detector evidence file
    global evidence_by_id
    if evidence_by_id is None:
        request = urllib.request.Request(EVIDENCE_URL, headers={"User-Agent": "alarm-gap"})
        with urllib.request.urlopen(request, timeout=10) as response:
            records = json.load(response)
        evidence_by_id = {record["id"]: record for record in records}
    return evidence_by_id


def reply(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def read_body(event):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    return json.loads(raw)


def tidy(text):
    # the model likes fancy hyphens, which break the id check
    for dash in "‐‑‒–—":
        text = text.replace(dash, "-")
    return text.strip()


def keep_cited(text, pattern=r"PSI-\d+"):
    # a sentence with no record id has nothing backing it, so it goes
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return " ".join(s for s in sentences if re.search(pattern, s))


def ask_model(question, records, instructions=INSTRUCTIONS):
    payload = {
        "model": MODEL,
        "temperature": 0,
        "reasoning_effort": "low",
        "max_completion_tokens": 1500,
        "messages": [
            {"role": "system", "content": instructions},
            {
                "role": "user",
                "content": "Question: " + question + "\n\nRecords:\n" + json.dumps(records),
            },
        ],
    }
    request = urllib.request.Request(
        GROQ_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + os.environ["GROQ_API_KEY"],
            "Content-Type": "application/json",
            # the default python user agent can get blocked
            "User-Agent": "alarm-gap",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        result = json.load(response)
    return tidy(result["choices"][0]["message"]["content"] or "")


def answer_evidence(question):
    # evidence mode: the model sees every detector record, since there are only a few
    try:
        known = load_evidence()
        raw = ask_model(question, list(known.values()), EVIDENCE_INSTRUCTIONS)
    except Exception as error:
        print("evidence answer failed:", error)
        return reply(502, {"error": "The model is unavailable."})

    if "NO_EVIDENCE" in raw:
        return reply(200, {"answer": "", "ids": [], "gap": True})

    answer = keep_cited(raw, r"\[[a-z0-9-]+\]")
    cited = set(re.findall(r"\[([a-z0-9-]+)\]", answer))
    if not cited or not cited <= set(known):
        print("dropped evidence answer:", raw)
        return reply(200, {"answer": "", "ids": [], "gap": True})

    return reply(200, {"answer": answer, "ids": sorted(cited), "gap": False})


def lambda_handler(event, context):
    try:
        body = read_body(event)
        if body.get("mode") == "evidence":
            question = str(body.get("question", "")).strip()[:300]
            if not question:
                return reply(400, {"error": "Send a question."})
            return answer_evidence(question)
        question = str(body.get("question", "")).strip()[:300]
        ids = [str(item) for item in body.get("ids", [])][:3]
    except (ValueError, AttributeError, TypeError):
        return reply(400, {"error": "Could not read the request."})

    if not question or not ids:
        return reply(400, {"error": "Send a question and up to three ids."})

    try:
        known = load_records()
        records = [known[item] for item in ids if item in known]
        if not records:
            return reply(400, {"error": "No matching records."})
        answer = keep_cited(ask_model(question, records))
    except Exception as error:
        print("answer failed:", error)
        return reply(502, {"error": "The model is unavailable."})

    # drop the answer if it cites anything we did not send
    cited = set(re.findall(r"PSI-\d+", answer))
    allowed = {record["id"] for record in records}
    if not cited or not cited <= allowed:
        print("dropped answer:", answer)
        return reply(200, {"answer": "", "ids": sorted(allowed), "dropped": answer[:400]})

    return reply(200, {"answer": answer, "ids": sorted(allowed)})
