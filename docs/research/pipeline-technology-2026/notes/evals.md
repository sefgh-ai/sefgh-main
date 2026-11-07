# Evaluations ("evals") for SEFGH: measuring model and pipeline decisions cheaply in CI

Research notes, 2026-10-26. Scope: evaluation methodology for repository search and for LLM-written summaries and labels, free/open-source eval tools, building a small labelled set, and gating model/provider switches in CI. Facts are in "Cited Findings" with a source on each line. Recommendations and arithmetic are in "Inferences" and are not sourced facts. Where a figure came only from a search-engine summary or a secondary blog, the line says so.

Status of this file: complete. It was written after a session interruption from findings gathered before it, then re-checked: the interleaving attribution, the Langfuse feature licensing and pytrec_eval. Items still unverified are listed under each Gaps section.

## 1. Retrieval evaluation methodology: metrics, number of queries, statistical tests, pooling, query sources

### Takeaway
Use graded relevance with nDCG@10 as the primary metric, plus Recall@k for the candidate stage, and compare two configurations with a paired t-test (or permutation test) on per-query differences. The IR literature does not give a single "enough queries" number. The count depends on the per-query variance of the metric and the smallest difference you care about, so SEFGH needs a pilot of about 50 queries to estimate variance before fixing the set size. For a fixed judging budget, more queries judged shallowly beats fewer judged deeply.

### Cited Findings
- **Which significance test.** Urbano, Lima and Hanjalic (SIGIR 2019) simulated over 500 million p-values from TREC data and "strongly recommend the use of the t-test for typical hypotheses pertaining to mean system effectiveness", calling it "simpler and remarkably robust to sample size". The permutation test "behaves almost identically" and can use statistics other than the mean. — [Urbano et al. 2019 (ar5iv)](https://ar5iv.labs.arxiv.org/html/1905.11096); [arXiv abstract](https://arxiv.org/abs/1905.11096)
- The same study proposes discontinuing the bootstrap-shift test, which "shows a systematic bias towards small p-values". It agrees that "the Wilcoxon and sign tests should be discontinued for being unreliable". — [Urbano et al. 2019](https://ar5iv.labs.arxiv.org/html/1905.11096)
- Measured Type I error at n=50 topics, α=0.05: t-test 0.05, permutation 0.05, bootstrap 0.059 (two-tailed). — [Urbano et al. 2019](https://ar5iv.labs.arxiv.org/html/1905.11096)
- **Metric variance matters.** P@10 and reciprocal rank (RR/MRR) have "between 2 and 4 times the standard deviation of the other measures", so they need more queries for the same power. Type III errors (significant in the wrong direction) "can be as high as 2%" for P@10, RR or small topic sets. The study used 25, 50 and 100 topics ("small, typical and large") and gives no fixed minimum. — [Urbano et al. 2019](https://ar5iv.labs.arxiv.org/html/1905.11096)
- **Power and topic count.** Webber, Moffat and Zobel (CIKM 2008) frame power as the number of topics needed to detect a given improvement. Estimating the variance of between-system differences from small trials has large error margins. Adding topics until significance appears biases results. For the same assessment effort, more topics judged shallowly give more power than fewer topics judged deeply. — [Webber, Moffat & Zobel 2008 abstract](https://people.eng.unimelb.edu.au/ammoffat/abstracts/wmz08cikm.html); [ACM listing](https://ir.webis.de/anthology/2008.cikm_conference-2008.60/)
- Sakai's topic set size design calculates the number of topics from α, β (power = 1-β) and a minimum detectable difference, using a variance estimated from a pilot topic-by-run score matrix. Different measures have "vastly different" variances. Excel tools exist for paired t-test, ANOVA and CI-width designs. — [Sakai 2016, Information Retrieval Journal](https://link.springer.com/article/10.1007/s10791-015-9273-z); [Sakai EVIA 2016 slides](https://research.nii.ac.jp/ntcir/workshop/OnlineProceedings12/pdf/evia/02-EVIA2016-SakaiT.pdf)
- Topic counts computed with Sakai's method across several TREC collections ranged from 16 to 706, at 90% power and not specific to nDCG. This shows how much the answer depends on collection and measure. — [Roitero, "Cheap IR Evaluation" thesis (arXiv 2011.00479), via search summary](https://arxiv.org/pdf/2011.00479)
- **Tool support.** ranx provides a paired Student's t-test, Fisher's randomization (permutation) test and Tukey's HSD (for comparing many systems at once), plus RRF and other fusion methods. — [ranx docs index](https://docsearch.algolia.com/mcp/docs/repo/amenra/ranx); [ranx on PyPI](https://pypi.org/project/ranx)
- ir_measures reports `Judged@10`, the fraction of the top 10 that has a judgment, alongside nDCG@k, AP, RR and P@k. It reads TREC-format qrels and run files. — [ir_measures README](https://github.com/terrierteam/ir_measures)
- **Synthetic queries.** Rahmani et al. (SIGIR 2024) built fully synthetic test collections, with queries from T5 or GPT-4 seeded on anchor passages and GPT-4 judgments. The resulting system rankings were comparable to human-judged collections by Kendall's τ. — [Rahmani et al. 2024, arXiv 2405.07767](https://arxiv.org/abs/2405.07767v1)
- A follow-up (CIKM 2025) says synthetic-data bias "could be significant" for absolute system performance but "may not be as significant in comparing relative system performance". — [Rahmani et al. 2025, "Towards Understanding Bias in Synthetic Data for Evaluation"](https://arxiv.org/abs/2506.10301v2)
- A search summary of the same 2025 paper reports Kendall's τ of 0.72–0.91 between synthetic and real rankings, and self-preference by GPT-based judges. I did not see these figures in the abstract. — [search summary of arXiv 2506.10301](https://arxiv.org/html/2506.10301v2)

### Inferences (recommendations, not sourced facts)
- **Metric set for SEFGH.**
  - Primary: nDCG@10 with a 0–3 graded scale. This matches UMBRELA and TREC DL, so an LLM judge prompt can be reused.
  - Secondary: Recall@50 or @100 per retriever arm (vector, full-text, fused). A reranker can only reorder what the candidate stage returns, so candidate recall decides whether a reranker is worth evaluating.
  - MRR only for a "navigational" query slice (the user types an owner/repo-like name). Urbano shows RR is high-variance, so do not use it as a gate.
- **Sample-size arithmetic.** For a paired t-test, n ≈ ((z₁₋α/₂ + z₁₋β) · σ_d / δ)², where σ_d is the standard deviation of per-query nDCG@10 differences and δ is the smallest difference worth detecting. With α=0.05 and 80% power, z-sum ≈ 2.80. The σ_d values below are assumptions, not SEFGH measurements:
  - σ_d=0.15, δ=0.05 → about 71 queries
  - σ_d=0.15, δ=0.03 → about 196 queries
  - σ_d=0.20, δ=0.05 → about 125 queries
  - Plan: label about 50 pilot queries, measure σ_d between two real candidates, then size the set. Fix n before looking at results, since Webber et al. warn that adding queries until significance biases the result.
- **Run the test on per-query differences.** Use a paired t-test as the default, a permutation test for non-mean statistics, and Holm correction (or Tukey HSD, as in ranx) when screening more than two embedding models. Both tests are a few dozen lines in Go's standard library, using `math` and `math/rand/v2` for permutations. That fits the project's standard-library-only rule.
- **Pooling.** Judge the union of the top ~20 results from every configuration under test (each candidate embedding model, BM25/full-text alone, hybrid RRF, with and without summaries). This "wide and shallow" choice follows Webber et al. When a new model enters, compute Judged@10. If it falls below about 0.9, judge the new unjudged documents before trusting the comparison, because unjudged documents are scored as non-relevant and penalise the newcomer.
- **Query sources.** Prefer real (privacy-scrubbed) search-log queries for realism. Add synthetic queries generated from repository READMEs to cover rare intents. Report results separately for real and synthetic queries, and never use synthetic-query absolute scores for go/no-go thresholds, per Rahmani 2025.

### Gaps
- I found no published σ_d for nDCG@10 on repository or code search, so the query counts above are illustrative only.
- A figure of "about 300 topics for a 0.05 MAP difference at 80% power" appeared in a search snippet, but I could not tie it to a verified source. It is excluded.
- I did not verify pooling-depth guidance specific to nDCG@10 (for example Voorhees' topic-set-size or pool-bias papers).

## 2. Benchmarks: MTEB / MMTEB / RTEB in 2026, code retrieval, repository-level search

### Takeaway
Public leaderboards are a shortlist filter, not a decision. MTEB's own maintainers added the partly private RTEB retrieval board (October 2025) because public-set scores overfit. CoIR (on the MTEB leaderboard) is the main code-retrieval benchmark. I found no public benchmark for natural-language-to-GitHub-repository search, so SEFGH's own labelled set is the deciding evidence for D3.

### Cited Findings
- **MMTEB** has 216 evaluation tasks, 131 of them in MTEB (Multilingual); the rest come from MTEB English v2, CMTEB and MTEB Code. — [MMTEB paper, arXiv 2502.13595](https://arxiv.org/pdf/2502.13595)
- **RTEB** (Hugging Face blog, 1 October 2025):
  - It is a beta retrieval benchmark that mixes open datasets with private datasets scored by the MTEB maintainers, to detect "teaching to the test".
  - Default metric nDCG@10; 20 languages; domains include legal, healthcare, finance and code (HumanEval, MBPP, APPS, DS1000 and WikiSQL open, plus two closed code sets).
  - Each dataset has at least 1k documents and 50 queries.
  - It appears as a new "Retrieval" section on the MTEB leaderboard.
  - "A model with a significant performance drop between the open and the private datasets would suggest overfitting."
  - Source: [HF blog: Introducing RTEB](https://huggingface.co/blog/rteb)
- The RTEB NeurIPS 2026 paper evaluates 20 models on 48 datasets (20 public, 28 private) across six domains and four languages. Rankings "diverge substantially from BEIR and MTEB", and agentic code retrieval is the hardest domain. These counts differ from the blog's tables (20 open / 13 closed by my tally), likely because the benchmark grew. — [NeurIPS 2026 poster page, via search summary](https://neurips.cc/virtual/2026/poster/139103); [InfoQ, Oct 2025](https://www.infoq.com/news/2025/10/rteb-benchmark)
- **Leaderboard state, autumn 2026 (secondary sources, not checked against the live leaderboard):**
  - Microsoft harrier-oss-v1-27b leads open, commercially usable models on MTEB Multilingual v2, with retrieval 78.27 vs Octen-Embedding-8B 71.61 and Qwen3-Embedding-8B 70.88.
  - A closed 8B model released in May 2026 tops English v2.
  - NVIDIA Nemotron-3-Embed-8B is the top open model on RTEB.
  - Qwen3-Embedding-8B scores 69.44 on English v2 retrieval.
  - The blogs disagree on metrics, and I did not separate which blog made which claim. Sources: [supermemory blog](https://supermemory.ai/blog/best-open-source-embedding-models-benchmarked-and-ranked/); [maximem blog](https://www.maximem.ai/blog/best-embedding-models-2026)
- The harrier-oss-v1 model card (primary):
  - Licence MIT; decoder-only; last-token pooling; 32,768-token context.
  - 27B model: 5,376 dimensions, MTEB v2 74.3.
  - Smaller variants: 270M at 640 dimensions scoring 66.5, and 0.6B at 1,024 dimensions scoring 69.0.
  - Matryoshka (truncatable) dimensions are not mentioned.
  - Source: [HF model card](https://huggingface.co/microsoft/harrier-oss-v1-27b)
- **CoIR** (ACL 2025) is a code information retrieval benchmark with ten datasets, eight tasks and seven domains. Its authors find state-of-the-art models struggle and argue many models overfit existing leaderboards. It shares the MTEB/BEIR data schema and is hosted on the MTEB leaderboard. — [CoIR paper](https://arxiv.org/pdf/2407.02883); [MTEB leaderboard, CoIR tab](https://mteb-leaderboard.hf.space/benchmark/CoIR)
- A compact "NanoCoIR" subset includes a CodeSearchNet split that maps code to documentation-style text. — [NanoCoIR docs](https://hakari-bench-leaderboard.hf.space/docs/benchmark-tasks/NanoCoIR)
- **Repository-level benchmarks found are different tasks.** NL2Repo (BenchLM, 2026) maps natural-language requests to code locations inside a repository. SketchEval / CodeS (2024) generates whole repositories. — [NL2Repo on BenchLM](https://benchlm.ai/benchmarks/nl2repo); [CodeS paper](https://arxiv.org/pdf/2403.16443)

### Inferences
- Use MTEB/RTEB to shortlist 3–5 candidates that fit SEFGH's constraints (licence, hosted API vs self-hosted, a dimension reducible to 768 for `halfvec`). Then decide on SEFGH's own qrels. Treat a large gap between a model's public MTEB score and its RTEB private score as a warning sign.
- SEFGH documents are README, description and topics, natural language describing software, not code bodies. The text-to-code tasks in CoIR and CodeSearchNet are therefore only a partial proxy. The closest public tasks are "documentation to code" or StackOverflow-style QA.
- Record the leaderboard snapshot date and the model revision in the decision record, since rankings move monthly.

### Gaps
- I could not load the live MTEB leaderboard (an interactive app), so all 2026 ranking numbers above are secondary.
- I found no public benchmark for "natural-language query → GitHub repository". A dedicated arXiv/SIGIR/MSR search for "repository recommendation" or "repo retrieval" was not completed.
- I did not verify Matryoshka support or 768-dimension truncation for the harrier models. The model card is silent.

## 3. LLM-as-judge for relevance labels and summary quality: agreement, biases, cost, calibration

### Takeaway
LLM relevance judges agree with humans about as well as typical crowd or third-party assessors (κ roughly 0.3–0.64 depending on prompt, scale and setup). They rank systems well overall but are unreliable at separating the top few systems. They also break down when the judged system uses the same LLM as the judge. Use an LLM judge to scale labels, never as the sole gate. Calibrate it against a small human-labelled subset, and keep the judge's model family different from any model inside the pipeline.

### Cited Findings
- **Bing study** (Thomas, Spielman, Craswell, Mitra; SIGIR 2024), using GPT-4 at temperature 0:
  - The best prompt reached κ = 0.64 (binary) against TREC assessors. Prompt variants ranged from about 0.20 to 0.64.
  - Human reference points: crowd workers 0.24–0.52, lab workers 0.58, two trained assessor groups 0.52.
  - Against real-searcher gold labels at Bing, relative accuracy was +28% for the LLM, +24% for employees and +19% for the best crowd workers, versus typical crowd.
  - Cost was about 1/20 of a typical crowd label. The paper notes these figures depend on Bing's own contracts.
  - Source: [Thomas et al., arXiv 2309.10621](https://arxiv.org/html/2309.10621v3); [Microsoft Research page](https://microsoft.com/en-us/research/publication/large-language-models-can-accurately-predict-searcher-preferences)
- **Prompt sensitivity** (same paper):
  - Effects on κ: adding "aspects" +0.208, narrative +0.057, description +0.013, a role statement −0.042, simulating multiple "judges" −0.127.
  - Paraphrasing alone moved mean κ between 0.50 and 0.72.
  - The authors recommend using real-searcher gold labels to "evaluate and select prompts for an LLM".
  - Source: [Thomas et al.](https://arxiv.org/html/2309.10621v3)
- **UMBRELA** (open-source reproduction with GPT-4o, zero-shot "DNA" prompt with aspects; temperature 0, top_p 1, frequency penalty 0.5) on TREC DL 2019–2023:

  | Year | 4-level κ | Binary κ | Kendall τ |
  |---|---|---|---|
  | DL 2019 | 0.361 | 0.499 | 0.893 |
  | DL 2020 | 0.351 | 0.450 | 0.944 |
  | DL 2021 | 0.373 | 0.492 | 0.934 |
  | DL 2022 | 0.336 | 0.422 | 0.873 |
  | DL 2023 | 0.308 | 0.418 | 0.911 |

  - Spearman ρ was 0.97–0.99 for all years.
  - Per-label accuracy: about 75% for non-relevant, 50% for "related", 30% for "highly relevant", 45% for "perfectly relevant".
  - The authors call this "fair agreement".
  - Column mapping was inferred from the page's table order. Source: [UMBRELA, arXiv 2406.06519](https://arxiv.org/html/2406.06519)
- In the TREC 2024 RAG track, UMBRELA rankings "correlate highly" with fully manual assessments across 77 runs from 19 teams, and LLM assistance to humans did not increase correlation. (From the search-result summary of the abstract.) — [Upadhyay et al., arXiv 2411.08275](https://arxiv.org/abs/2411.08275v1)
- **Rebuttal (Clarke & Dietz, 2024/25).** Overall τ hides frontier errors on the same TREC 2024 RAG data:
  - Top 60 systems: τ ≈ 0.84.
  - Top 20: τ = 0.51 (24% of pairs swapped). Top 15: τ = 0.56.
  - The top automatic system ranks 5th manually.
  - A run that used an LLM judge as its reranker ranked 5th automatically but 28th manually.
  - When the judge is also the final-stage reranker (circularity), top-5 τ is −0.40. Twelve systems scored above 0.95 nDCG automatically but 0.68–0.72 under human judgments.
  - They also raise self-preference ("narcissism"), prompt-injection and Goodhart's-law risks.
  - Source: [Clarke & Dietz, arXiv 2412.17156](https://arxiv.org/html/2412.17156v2)
- **Soboroff (NIST)** argues against using LLMs to create TREC-style relevance judgments, because the judging LLM becomes a ceiling on measurable performance. — [Soboroff, "Don't Use LLMs to Make Relevance Judgments", arXiv 2409.15133](https://arxiv.org/html/2409.15133v1); [IRRJ version](https://testplatform.openjournals.nl/IRRJ/article/view/19625)
- **Generic LLM-judge biases** (MT-Bench study): position, verbosity and self-enhancement biases, plus limited reasoning. Strong judges like GPT-4 still reach over 80% agreement with human preferences, the same level humans reach with each other. — [Zheng et al., arXiv 2306.05685](https://arxiv.org/abs/2306.05685)
- **Calibration with a small human set.** ARES (NAACL 2024) uses prediction-powered inference (PPI): a small human-annotated set corrects an automatic judge's errors and yields confidence intervals. Across eight tasks, "a few hundred human annotations" sufficed. Its axes are context relevance, answer faithfulness and answer relevance. — [ARES, arXiv 2311.09476](https://arxiv.org/html/2311.09476v2)
- Synthetic-collection work reports possible bias toward systems from the same model family as the judge, and examined it by grouping TREC DL 2023 runs by model family (GPT, T5, other). — [Rahmani et al. 2024](https://arxiv.org/abs/2405.07767v1)

### Inferences
- **Relevance labels for SEFGH.**
  - Use an UMBRELA-style prompt: description of the intent, narrative, then aspects (match to intent, trustworthiness/maintenance signals), and a final integer 0–3, at temperature 0.
  - Store the judge model id, prompt hash and raw output with each label.
  - Choose the judge model from a different family than the summary writer, the reranker and the query rewriter, to avoid the circularity Clarke & Dietz measured. If the pipeline later uses an LLM reranker, that model must not be the judge.
- **Calibration loop.**
  - The owner hand-labels a stratified random sample (start at about 100 query–repo pairs, grow towards 300).
  - Report Cohen's κ (binary and 4-level) of LLM vs owner, and select the prompt variant with the highest κ.
  - For headline numbers, apply PPI-style correction: the LLM mean plus a correction from the human-labelled subset, with an interval. A fixed prompt can be re-validated with the same human subset whenever the judge model changes.
- **Gating policy.** Let the LLM judge fill pool holes and screen candidates. A decision that hinges on a small difference among the top configurations must be confirmed on human-labelled queries, since that is where τ drops to about 0.5.
- **Summary and label quality (D4 and the label-writer choice).** Judge summaries on (a) faithfulness, meaning every claim is supported by the README or metadata, (b) coverage of what the repository does, language and status, and (c) no invented facts such as stars or licence. Use pairwise A/B with randomised order to counter position bias, length-controlled instructions against verbosity bias, and a judge from a different family than the writer against self-preference.
- **The deciding D4 metric is retrieval, not summary prettiness.** Measure ΔnDCG@10 and ΔRecall@50 of "document recipe with summary" vs "without" on the same qrels, with a paired test. Summary-quality scores only explain why.
- **Cost.** Example volume: 100 queries × a pool of about 30 documents ≈ 3,000 judgments per full judging pass. Re-judging is only needed for newly surfaced documents, so incremental cost per candidate model is much smaller. I did not research or verify provider prices.

### Gaps
- A search summary said no LLMJudge-challenge group exceeded κ 0.45 against humans, and that human–human binary κ can exceed 0.5. I could not confirm the exact source paper (possibly arXiv 2504.12558), so this is excluded from the findings.
- I found no study of LLM-judge agreement specific to code or repository relevance.
- I did not open the Rahmani 2025 full text to confirm τ 0.72–0.91 and the self-preference findings.
- No verified per-token prices for candidate judge models were collected here.

## 4. Tools (2025–2026): licences, free tiers, CI integration, JSON output, fit for Go + GitHub Actions

### Takeaway
No eval tool is native to Go. The cheapest robust setup is:
1. Compute retrieval metrics and paired tests in Go, inside the existing `searchparity`-style offline checker.
2. Exchange data in TREC qrels/run format, so Python tools (ir_measures, ranx) can cross-check the Go numbers.
3. Optionally add promptfoo (MIT, now owned by OpenAI) or DeepEval (Apache-2.0) for LLM-output assertions.

Hosted platforms (Braintrust, OpenAI Evals) are unnecessary. OpenAI's hosted Evals shuts down on 30 November 2026. Langfuse (MIT, self-hostable) is the best open option if traces and human annotation are wanted later.

### Cited Findings
- **promptfoo**
  - OpenAI announced the acquisition on 9 March 2026; technology to be folded into OpenAI Frontier; terms undisclosed. OpenAI said it expects to keep building the open-source offering. — [TechCrunch](https://www.techcrunch.com/2026/03/09/openai-acquires-promptfoo-to-secure-its-ai-agents/); [Security Boulevard](https://securityboulevard.com/2026/03/openai-acquires-security-startup-promptfoo-to-fortify-ai-agents); [OpenAI announcement](https://openai.com/zh-Hans-CN/index/openai-to-acquire-promptfoo/)
  - The GitHub repo shows the MIT licence, about 26.4k stars and "Promptfoo is now part of OpenAI". — [github.com/promptfoo/promptfoo](https://github.com/promptfoo/promptfoo)
  - CI: `-o results.json`, `-o report.html`, `-o results.junit.xml` (repeatable); `--fail-on-error`; the docs show a `jq` pass-rate threshold script; GitHub Action `promptfoo/promptfoo-action@v1`; caching via `PROMPTFOO_CACHE_PATH`/`PROMPTFOO_CACHE_TTL` with `actions/cache`. — [promptfoo CI/CD docs](https://www.promptfoo.dev/docs/integrations/ci-cd/)
- **OpenAI Evals (hosted).** Deprecation notice 3 June 2026; read-only from 31 October 2026; dashboard and API shut down 30 November 2026. OpenAI points to "Moving from OpenAI Evals to Promptfoo". The open-source `openai/evals` GitHub repo reportedly remains public and unarchived (third-party, July 2026). — [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations); [third-party review](https://aicoolies.com/reviews/openai-evals-review)
- **DeepEval** (Confident AI): Apache-2.0, about 19.1k stars, pytest-like `deepeval test run`. Metrics include G-Eval, Faithfulness, Contextual Relevancy and Summarization. Any LLM, including local models, can be the judge, and the Confident AI cloud is optional. — [github.com/confident-ai/deepeval](https://github.com/confident-ai/deepeval). A secondary audit lists v4.1.5 (2026-07-29). — [Techsy audit](https://techsy.io/en/blog/llm-evaluation-framework-open-source)
- **Ragas:** Apache-2.0, about 16.2k stars, now under `vibrantlabsai/ragas`, with test-set generation as a key feature. — [github.com/vibrantlabsai/ragas](https://github.com/vibrantlabsai/ragas). A secondary audit lists v0.4.3 and says no commits since 2026-02-24 after the move to the new organisation. That conflicts with the repo page showing active "coming soon" templates, so activity is unverified. — [Techsy audit](https://techsy.io/en/blog/llm-evaluation-framework-open-source)
- **Inspect** (UK AI Security Institute): MIT. inspect-ai 0.3.224 was released 20 May 2026, per a PyPI mirror. Repo: github.com/UKGovernmentBEIS/inspect_ai. — [PyPI mirror](https://simple-repository.app.cern.ch/project/inspect_ai); [TechCrunch 2024 launch](https://techcrunch.com/2024/05/11/u-k-agency-releases-tools-to-test-ai-model-safety)
- **Braintrust** (proprietary SaaS):
  - Free "Starter" plan: $0 with 1 GB processed data, 10,000 scores, $10 credits and 14-day retention.
  - Pro: $249/month.
  - Span metering was replaced by data volume from 16 March 2026.
  - Aggregator data, not checked on Braintrust's own page. — [flexprice pricing index](https://flexprice.io/pricing-index/braintrust); [Capterra](https://www.capterra.com/p/10050154/Braintrust/pricing/)
- **Langfuse:** ClickHouse announced the acquisition on 16 January 2026. Core features stay MIT and self-hostable; Langfuse Cloud continues. Langfuse's FAQ says self-hosting is available on every tier with no usage fee, and an optional Enterprise licence adds RBAC, audit logs and retention policies. — [ClickHouse blog](https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability); [Langfuse clarifications/FAQ](https://langfuse.com/resources/engineering/clarifications)
- In June 2025 (v3.65.0), Langfuse moved previously commercial features to MIT: managed LLM-as-a-judge evaluations, annotation queues (human review of traces), prompt experiments and the playground. Only enterprise security features (SCIM, audit logs, retention policies) stay commercial; regular SSO is MIT. — [Langfuse blog, 2025-06-04](https://langfuse.com/blog/2025-06-04-open-sourcing-langfuse-product); [Langfuse changelog](https://langfuse.com/changelog/2025-06-04-open-sourcing-langfuse)
- **pytrec_eval:** MIT licence. A Python wrapper around NIST trec_eval, which is pinned as a git submodule and licensed separately. 354 stars; no releases listed; latest commit date not shown. — [github.com/cvangysel/pytrec_eval](https://github.com/cvangysel/pytrec_eval)
- **Arize Phoenix:**
  - Licence is Elastic License 2.0 (not OSI-approved; it prohibits offering it as a hosted service to third parties). About 12k stars.
  - Self-hosted via Docker or Helm.
  - Offers LLM evals for response and retrieval quality, versioned datasets and experiments.
  - Tracing via OpenTelemetry/OpenInference.
  - Sources: [github.com/Arize-ai/phoenix](https://github.com/Arize-ai/phoenix); [Techsy audit on ELv2 terms](https://techsy.io/en/blog/llm-evaluation-framework-open-source)
- **MLflow 3:** `mlflow.genai.evaluate` with built-in judges, including `RetrievalRelevance` (per retrieved document) and `RetrievalGroundedness`. Custom judges via `make_judge`, and code-based scorers. The judges need mlflow ≥ 3.4.0 per the Databricks docs. — [MLflow 3.4 predefined scorers](https://mlflow.org/docs/3.4.0/genai/eval-monitor/scorers/llm-judge/predefined); [Databricks judges](https://docs.databricks.com/gcp/en/mlflow3/genai/eval-monitor/concepts/judges/is_context_relevant)
- **ranx:** Numba-accelerated Python. Metrics are checked against trec_eval. Offers paired t-test, Fisher randomization and Tukey HSD, plus fusion (RRF, BordaFuse) with parameter optimisation. Loads qrels from ir-datasets. — [ranx on PyPI](https://pypi.org/project/ranx); [ranx docs](https://docsearch.algolia.com/mcp/docs/repo/amenra/ranx)
- **ir_measures:** Apache-2.0. A common interface to many IR measure tools. CLI `ir_measures qrels run 'nDCG@10 P@10 Judged@10'` reads TREC-format files; `-q` gives per-query output. — [github.com/terrierteam/ir_measures](https://github.com/terrierteam/ir_measures)
- **Vercel eve** (agent framework announced June 2026, per secondary sources):
  - Evals are one of six default capabilities.
  - Suites live in `agent/evals/` and run with `eve eval`, locally or in CI.
  - They check final answers and which tools the agent called.
  - Vercel separately released `agent-eval` for testing coding agents.
  - No official docs were opened. — [InfoQ](https://infoq.com/news/2026/06/vercel-eve-agents/); [practical guide](https://pasqualepillitteri.it/en/news/5680/how-to-build-ai-agent-vercel-eve-guide)

### Inferences
- **Fit for SEFGH.**
  - Retrieval: implement nDCG@k, Recall@k, MRR, Judged@k, paired t-test and permutation test in Go under `backend/` (standard library only). Write TREC run files so a one-off or nightly Python job can cross-check with ir_measures or ranx. Treat ranx/ir_measures agreement as the Go scorer's own regression test (golden numbers in fixtures).
  - Summary and label generation: promptfoo can call a Go binary or HTTP endpoint as a provider and emit JSON/JUnit, but it adds a Node dependency to CI. DeepEval adds Python. Either is acceptable in a separate optional workflow. The required gate should not depend on them.
  - Vercel eve evals target agent behaviour (tool calls) in a TypeScript agent framework. They are not a retrieval-metrics tool and not a fit for D3/D4.
  - Avoid hosted-only tools for gates. OpenAI Evals' shutdown shows the risk. Braintrust's free tier (10k scores) would also be exhausted quickly by per-query judging.
  - Arize Phoenix's ELv2 is fine for internal self-hosting, but it is not open source by the OSI definition. Langfuse (MIT) is preferable if a trace and annotation UI is wanted. Its MIT annotation queues could double as the owner's labelling UI for the human calibration subset (Section 5). That adds a self-hosted service (Postgres plus ClickHouse), so it is only worth it if traces are also wanted.

### Gaps
- Not verified this session:
  - pytrec_eval's recent maintenance activity. It shows only 25 commits and no dated release, so treat it as low-activity; ir_measures or ranx are the better-maintained front ends.
  - MLflow's licence (widely reported Apache-2.0).
  - promptfoo's `exec:`/HTTP provider syntax (not shown on the CI page).
  - Braintrust pricing on its own page.
- I found no Go-native eval framework of note; none was searched exhaustively.

## 5. Building and maintaining a small labelled set cheaply

### Takeaway
Use graded qrels for 50→100–200 stratified queries. Pool shallowly from every candidate configuration and pre-label with an LLM judge. Have the owner hand-label a few hundred pairs to calibrate the judge and correct its estimates. Version the set in Git as TREC-format qrels with provenance per label, and add queries incrementally from real (scrubbed) logs.

### Cited Findings
- For a fixed assessment effort, more topics judged shallowly yield more statistical power than fewer judged deeply. — [Webber, Moffat & Zobel 2008](https://people.eng.unimelb.edu.au/ammoffat/abstracts/wmz08cikm.html)
- A few hundred human annotations plus PPI gave accurate, confidence-bounded estimates of automatic-judge scores across eight tasks. — [ARES](https://arxiv.org/html/2311.09476v2)
- Prompt selection should use a small gold set of real-user preferences. Prompt choice alone swung κ from about 0.20 to 0.64. — [Thomas et al.](https://arxiv.org/html/2309.10621v3)
- Fully synthetic queries and labels preserved relative system rankings (τ comparable to human collections), but absolute scores can be biased. — [Rahmani et al. 2024](https://arxiv.org/abs/2405.07767v1); [Rahmani et al. 2025](https://arxiv.org/abs/2506.10301v2)
- RTEB requires at least 50 queries per dataset as a floor for a retrieval dataset. — [HF RTEB blog](https://huggingface.co/blog/rteb)
- ir_measures' `Judged@k` measures pool coverage, flagging when a new run surfaces unjudged documents. — [ir_measures](https://github.com/terrierteam/ir_measures)

### Inferences (proposed procedure)
1. **Query inventory.** Draw about 50 queries from the existing site search box or logs, if any exist, after removing user identifiers. Fill gaps with hand-written and LLM-generated queries. Stratify by intent:
   - navigational ("supabase js client")
   - functional ("library to parse PDF in Go")
   - comparative or alternative ("alternatives to Redis")
   - constraint-heavy ("rust TUI framework, actively maintained")
   - non-English
   - typo-ridden
   Tag each query with source (log / hand / synthetic) and intent.
2. **Pooling.** For each query, take the top 20 from each configuration (each candidate embedding model, full-text alone, RRF hybrid, with and without summary). Dedupe, then LLM-judge on a 0–3 scale with the frozen UMBRELA-style prompt.
3. **Human calibration.** The owner labels a stratified random 10–20% of pairs (about 100–300) in a simple local UI or spreadsheet, blind to the LLM label. Compute κ. If binary κ falls below about 0.4 (UMBRELA's level), fix the prompt or rubric before using the labels.
4. **Storage.** Use `evals/qrels/<set>-v<N>.tsv` (TREC qrels plus columns for label source, judge model, prompt hash and date), `evals/queries/<set>-v<N>.tsv`, and a CHANGELOG. Queries and labels are append-only. A new version is created when labels change, and old versions stay reproducible.
5. **Maintenance.** When a new model's Judged@10 is below about 0.9, judge only the new holes. Quarterly, add 10–20 fresh real queries. Keep about 20% of queries as a held-out set never used for prompt or parameter tuning, so the set is not overfit the way public leaderboards are.
6. **Corpus snapshot.** Freeze the evaluated repository corpus (ids and the document text recipe) per qrels version, because repositories change and README edits alter relevance.

### Gaps
- I found no published cost or time per human judgment for repository relevance.
- No privacy guidance specific to storing search queries from a small site was researched; the general principle is in Section 7.

## 6. Gating model/provider switches in CI, and versioning embedding spaces

### Takeaway
Gate every switch of embedding model, dimension, document recipe, reranker or summary LLM with a paired, per-query comparison against the current baseline on the frozen qrels. Use a non-inferiority rule: block if the 95% confidence bound shows a drop larger than a set margin, not merely when the mean dips. Record every embedding space with an immutable manifest. Run expensive steps (embedding the corpus, LLM judging) only on demand or nightly, with cached artifacts, to stay inside 2,000 Actions minutes and the $300 credit.

### Cited Findings
- promptfoo's documented CI gate is `--fail-on-error` or a script that parses `results.json` and exits non-zero below a pass-rate threshold, with caching to avoid repeated API calls. — [promptfoo CI/CD docs](https://www.promptfoo.dev/docs/integrations/ci-cd/)
- DeepEval runs LLM test cases pytest-style via `deepeval test run`. — [DeepEval](https://github.com/confident-ai/deepeval)
- The paired t-test keeps Type I error at the nominal level even at small n, which makes it suitable as an automated gate statistic. — [Urbano et al. 2019](https://ar5iv.labs.arxiv.org/html/1905.11096)
- Leaderboard scores can reflect overfitting, so MTEB maintainers now compare open vs private dataset performance. — [HF RTEB blog](https://huggingface.co/blog/rteb)
- The harrier-oss-v1 family shows why dimension and model must be recorded together: 640, 1,024 and 5,376 dimensions for the 270M, 0.6B and 27B sizes. — [HF model card](https://huggingface.co/microsoft/harrier-oss-v1-27b)

### Inferences (recommended design)
- **Embedding-space manifest.** One JSON file per space, committed and hashed. Fields:

  | Field group | Fields |
  |---|---|
  | Identity | `space_id` |
  | Model | `provider`, `model_id`, `model_revision` (Hugging Face commit SHA or the provider's dated version string) |
  | Vector shape | `native_dim`, `stored_dim`, `truncation` (Matryoshka or none), `dtype` (e.g. `halfvec`), `normalized`, `distance` (cosine/IP) |
  | Inputs | `query_instruction`/prefix, `doc_recipe_version` (fields, template, max tokens, summary model and prompt hash if summaries are included) |
  | Provenance | `tokenizer_max_len`, `corpus_snapshot_id`, `created_at` |

  Eval results are stored keyed by `space_id` and qrels version. This extends the project rule that equal dimensions do not make models compatible. A runtime check should refuse to compare a query vector against a corpus column whose manifest differs.
- **Two CI tiers.**
  - *Tier 1, every PR touching search code (cheap, deterministic, no API keys):* replay frozen candidate lists (searchparity-style), recompute fusion and ranking, and score against the frozen qrels in Go. Fail if any metric changes when no change was intended. Cost: seconds to minutes.
  - *Tier 2, a `workflow_dispatch` or label-triggered "candidate" run:* embed only the about 100–200 queries live. Corpus vectors for each space are precomputed once and stored as a release artifact or a separate pgvector table. Run retrieval, judge only holes with the cached LLM judge, then compute per-query deltas.
  - Tier 2 pass rule (non-inferiority): lower 95% bound of mean ΔnDCG@10 > −0.02, and ΔRecall@50 lower bound > −0.02.
  - A switch claimed as an improvement additionally needs the lower bound > 0, confirmed on the human-labelled subset.
  - Write a JSON report (metrics, CIs, p-values, manifest hashes) as a build artifact and a step-summary table.
- **Margins and X.** Start with X = 0.02 nDCG@10. Revisit after the pilot measures σ_d, because the margin must exceed what n queries can resolve. With σ_d ≈ 0.15 and n = 100, the 95% CI half-width is about 1.96 × 0.15 / √100 ≈ 0.03, so a 0.02 margin needs more queries or lower variance.
- **Provider swaps for summaries and labels.** Gate on (a) the retrieval effect of regenerated summaries on a sample, (b) faithfulness pass rate on a fixed 50–100 repository sample judged by a different-family model, and (c) schema validity (deterministic Go checks). Cache LLM outputs keyed by (model, prompt hash, input hash), so reruns cost nothing.
- **Budget hygiene.** Keep Tier 2 off the default PR path. Store vectors and judge outputs as artifacts or in the database. Use the $300 Google Cloud credit only for bulk corpus embedding or judging runs, never in per-PR loops.

### Gaps
- I did not verify GitHub Actions per-OS minute multipliers or artifact-storage limits for private repositories.
- No public example was found of a team using a non-inferiority gate on nDCG in CI. The design above is a recommendation, not an observed industry practice.

## 7. Online evaluation later: privacy-respecting click/skip signals, interleaving or A/B on a small site

### Takeaway
On a low-traffic site, A/B tests on click metrics will rarely reach significance. Team-draft interleaving is reported to be 1–2 orders of magnitude more sensitive, because each user compares both rankers. Use it later as a tie-breaker between two offline-qualified configurations, logging only anonymous, aggregated click positions.

### Cited Findings
- Schuth, Hofmann & Radlinski, "Predicting Search Satisfaction Metrics with Interleaved Comparisons" (SIGIR 2015), calibrated interleaving credit functions to predict A/B outcomes. Across 38 large-scale web-search experiments with over 3 billion clicks, they report up to 22% better agreement with A/B metrics (over 50% error reduction), with sensitivity one to two orders of magnitude above A/B tests. An earlier search summary had misattributed this to Chapelle et al.; it was re-checked and corrected. — [Microsoft Research publication page](https://www.microsoft.com/en-us/research/publication/predicting-search-satisfaction-metrics-with-interleaved-comparisons/); [paper PDF](https://microsoft.com/en-us/research/wp-content/uploads/2016/02/fp041-schuthA.pdf)
- Industry glossaries repeat that interleaving needs 10–100× fewer users than A/B to detect the same effect, because each user is their own control. Interleaving measures only relative preference, not absolute business lift. — [Spotify Confidence glossary](https://confidence.spotify.com/glossary/interleaving); [MetricGate](https://metricgate.com/blogs/interleaving-experiments-ranking-evaluation/)
- Team-draft interleaving (Radlinski, Kurup & Joachims, 2008) alternates picks from the two rankers, with a coin flip for first pick, and credits each click to the ranker that contributed the result. — [MetricGate explainer](https://metricgate.com/blogs/interleaving-experiments-ranking-evaluation/)

### Inferences
- **Signals to log (privacy-respecting):**
  - per-search: a random search id, the normalised query text only if the owner accepts storing it, configuration id, interleaving team assignment for each shown result, clicked positions, and a coarse "returned to results within N seconds" flag
  - no user ids, IP addresses or cross-session identifiers
  - aggregate and expire raw rows after, for example, 30–90 days
  - Clicks are biased by position, so treat them only as relative evidence within the interleaving comparison, not as relevance labels.
- Feed clicked-but-unjudged repositories back into the offline judging queue. That is the cheapest source of fresh, realistic queries.
- A full A/B test is only worth it for user-visible changes (UI, summary display). Ranking changes should use offline qrels first, then interleaving.

### Gaps
- I could not open the Airbnb interleaving engineering post (HTTP 404), so it provides no figures here.
- I did not verify Chapelle et al. 2012 (TOIS, "Large-scale validation and analysis of interleaved search evaluation") figures directly.
- I found no guidance on the minimum traffic needed for interleaving on small sites.
