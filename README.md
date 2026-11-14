# Alarm Gap

Team Heat Sync built [Alarm Gap](https://main.d10dgoqf0gsajx.amplifyapp.com/) for
the [Flame in Freefall challenge](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/).
It helps spacecraft fire-safety researchers find relevant NASA experiments and
compare the reported detector evidence for overheated Teflon and Kapton.

- Ask a question to rank nine investigations from NASA's Physical Sciences Informatics repository.
- Compare the reported detector signals and test conditions. The Moon setting links
  to related lunar flammability research and proposes a detector follow-up test.
- Download the evidence cards or the reported smoke particle measurements as CSVs.

The data and site are served by AWS Amplify. MiniLM ranks matches in the browser.
An AWS Lambda function uses Groq's `openai/gpt-oss-120b` model to give short
answers with citations for the investigation and detector questions. Read the linked
records and their limits alongside each generated summary. Results are limited to the
supplied records and research conditions.

## Local preview

From the repository root, run `python -m http.server 8000 --directory public` and
open [http://localhost:8000/](http://localhost:8000/). The Lambda browser allowlist
uses this exact address and port for local testing.

## Sources and tools

- [NASA SAME experimental table](https://psi.nasa.gov/physci/repo/data/investigations/PSI-102)
- [NASA and NIST detector study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7918997/#F9)
- [SAME Final Science Report, Figure 12](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=904707#page=24) and [Table 1](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=904707#page=25)
- [NASA Lunar Combustion Investigation flight results](https://ntrs.nasa.gov/citations/20250010653)
- [Transformers.js 3.8.1](https://github.com/huggingface/transformers.js/tree/3.8.1), Apache 2.0
- [MiniLM model](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/751bff37182d3f1213fa05d7196b954e230abad9), Apache 2.0

## AI disclosure

Codex assisted with implementation and testing. Claude helped draft the investigation
summaries and the free-text ranking code. The investigation cards link to the original
NASA PSI records. The app labels summaries generated during use, and labels follow-up
tests as proposals.
