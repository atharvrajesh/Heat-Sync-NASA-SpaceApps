# Heat-Sync-NASA-SpaceApps

Alarm Gap helps researchers compare NASA spacecraft smoke detector evidence.
The browser model ranks records within each evidence type. Findings, limits,
and links come from the evidence file. The follow-up test is a proposal.

## Sources and tools

- [NASA SAME experimental table](https://psi.nasa.gov/physci/repo/data/investigations/PSI-102)
- [NASA and NIST detector study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7918997/#F9)
- [SAME Final Science Report, Figure 12](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=904707#page=24) and [Table 1](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=904707#page=25)
- [Transformers.js 3.8.1](https://github.com/huggingface/transformers.js/tree/3.8.1), Apache 2.0
- [MiniLM model](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/751bff37182d3f1213fa05d7196b954e230abad9), Apache 2.0

Codex assisted with implementation and testing. The browser runs MiniLM for
semantic ranking. The evidence text and proposed test are presented separately
from model output.
