# Embedding models, rerankers and Postgres search for SEFGH semantic search (researched 2026-10-26)

Context: SEFGH plans one recorded embedding space (768-dim `halfvec`), HNSW plus Postgres full-text search fused with reciprocal-rank fusion (RRF) in one SQL function, cached query embeddings, on Supabase free tier (500 MB, Postgres 17, pgvector 0.8.0). Today Ollama `nomic-embed-text` and a Google model are mixed in one 768-dim index (recorded bug). Budget: free tiers plus $300 Google Cloud credits, a small physical server later, models swappable by configuration. Vendor benchmark numbers below are self-reported unless stated; MTEB versions (v1 English, v2 English, Multilingual v2 / MMTEB, Code) are not interchangeable.

## Q1. Open-weight embedding models (2025-2026): licence, dimensions, Matryoshka, context, quality, CPU speed

### Takeaway
For a 768-dim index, the strongest small, permissively usable options are EmbeddingGemma-300M (Gemma terms, native 768, MRL 512/256/128, 2K context), Qwen3-Embedding-0.6B (Apache-2.0, native 1024, MRL to any size 32-1024, 32K context, higher scores) and IBM Granite-embedding-english-r2 (Apache-2.0, native 768, 8K context, English + code). Newer 2026 models (Microsoft harrier-oss-v1, MIT, April 2026; Jina v5, February 2026) score higher on leaderboards but harrier documents no Matryoshka truncation and Jina v5 is non-commercial (CC-BY-NC-4.0).

### Cited Findings

**EmbeddingGemma-300M (Google)**
- 308M parameters, Gemma 3 based, 100+ languages, 2,048-token context, 768-dim output with Matryoshka truncation to 512/256/128 ("truncated and re-normalized"); licence is the Gemma Terms of Use (gated: users must accept Google's terms); paper dated 24 Sep 2025 — [HF model card](https://huggingface.co/google/embeddinggemma-300m); [Google overview](https://ai.google.dev/gemma/docs/embeddinggemma)
- Scores (Mean Task): MTEB Multilingual v2 61.15 @768 / 60.71 @512 / 59.68 @256 / 58.23 @128; MTEB English v2 69.67 @768 / 68.37 @256; MTEB Code v1 68.76 @768 / 66.74 @256 / 62.96 @128 — [HF model card](https://huggingface.co/google/embeddinggemma-300m)
- Quantisation-aware checkpoints: Q4_0 scores 60.62 multilingual / 67.99 code at 768d; Q8_0 60.93 / 68.70 — [HF model card](https://huggingface.co/google/embeddinggemma-300m)
- Prompt formats: query `task: search result | query: {content}`; document `title: {title | "none"} | text: {content}`; dedicated `task: code retrieval | query: ...` — [HF model card](https://huggingface.co/google/embeddinggemma-300m)
- Activations do not support float16; use float32 or bfloat16 — [HF model card](https://huggingface.co/google/embeddinggemma-300m)
- Speed: Google states "<22 ms" on EdgeTPU and runs in under 200 MB RAM when quantised; input length for that figure not stated — [Google overview](https://ai.google.dev/gemma/docs/embeddinggemma) (via search snippet). No x86 server CPU throughput figures found.

**Qwen3-Embedding 0.6B / 4B / 8B (Alibaba Qwen)**
- Apache-2.0; paper arXiv 2506.05176 dated 5 Jun 2025; dims 1024 / 2560 / 4096; 32K context; MRL "custom dimensions" (0.6B: 32-1024); instruction-aware — [HF model card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
- MTEB Multilingual: 64.33 / 69.45 / 70.58; MTEB English v2: 70.70 / 74.60 / 75.22; C-MTEB 66.33 / 72.27 / 73.84. Same table: gemini-embedding (exp-03-07) 68.37 multilingual; BGE-M3 59.56 multilingual — [HF model card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
- Qwen3-Embedding-0.6B scored 75.41 on MTEB-Code (as the first-stage baseline in Qwen's reranker table) — [Qwen3-Reranker-0.6B card](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B)

**Microsoft harrier-oss-v1 (Bing team), new in 2026**
- MIT licence; sizes 270M (640-dim), 0.6B (1,024-dim), 27B (5,376-dim); 32,768-token context on the HF card; 94 languages; queries need `Instruct: {task}\nQuery: {query}`, documents no instruction; MTEB Multilingual v2: 66.5 / 69.0 / 74.3; Matryoshka truncation not mentioned — [HF model card harrier-oss-v1-0.6b](https://huggingface.co/microsoft/harrier-oss-v1-0.6b)
- Published 7 Apr 2026; 27B ranked #1 on multilingual MTEB v2 at launch; leaderboard "zero-shot" column 78% for harrier vs 99% for Qwen3-Embedding and gemini-embedding-001 — [The Decoder](https://the-decoder.com/microsofts-bing-team-open-sources-harrier-embedding-model/)
- Several 2026 roundups also name harrier-oss-v1-27b top of MTEB Multilingual v2, and NVIDIA "Nemotron-3-Embed-8B" top open model on the RTEB retrieval board (secondary, not verified) — [FutureAGI](https://futureagi.com/blog/best-embedding-models-2025/); [Maximem](https://www.maximem.ai/blog/best-embedding-models-2026)

**Nomic**
- nomic-embed-text-v1.5 (what Ollama's `nomic-embed-text` serves; Apache-2.0): 768-dim, MRL 512/256/128/64, 8,192 tokens, MTEB (v1 English) 62.28 @768 / 61.04 @256; mandatory prefixes `search_query:` / `search_document:`; paper 2 Feb 2024 — [HF card v1.5](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5)
- nomic-embed-text-v2-moe: Apache-2.0, ~475M total / 305M active params (MoE), 768-dim, Matryoshka to 256, only 512-token context, ~100 languages, BEIR 52.86, MIRACL 65.80, mandatory prefixes, `trust_remote_code=True`; tech report 11 Feb 2025 — [HF card v2-moe](https://huggingface.co/nomic-ai/nomic-embed-text-v2-moe)
- nomic-embed-code: Apache-2.0, 7B (Qwen2.5-Coder-7B base); CodeSearchNet Python 81.7 / Java 80.5 / Ruby 81.8 / PHP 72.3 / JS 77.1 / Go 93.8 vs voyage-code-3 80.8 / 80.5 / 84.6 / 71.7 / 79.2 / 93.2 — [HF card](https://huggingface.co/nomic-ai/nomic-embed-code)

**Jina AI (acquired by Elastic, completed 9 Oct 2025)**
- jina-embeddings-v4: 4B (Qwen2.5-VL-3B base), 2048-dim single vector, MRL 128/256/512/1024/2048, 128-dim multi-vector mode, 32K context, adapters for retrieval/text-matching/code; licence corrected to the Qwen Research License (initially mislabelled CC-BY-NC-4.0); paper 23 Jun 2025 — [HF card](https://huggingface.co/jinaai/jina-embeddings-v4)
- jina-code-embeddings-0.5b: CC-BY-NC-4.0, Qwen2.5-Coder-0.5B base, 896-dim, MRL 64/128/256/512/896 (no 768), 32K context, task prefixes nl2code/code2code/code2nl/code2completion/qa; paper 29 Aug 2025 — [HF card](https://huggingface.co/jinaai/jina-code-embeddings-0.5b); CoIR 73.94 — [jina-reranker-v3 card table](https://huggingface.co/jinaai/jina-reranker-v3)
- jina-embeddings-v5-text-small (677M, 1024-dim, MRL 32-1024, 32K ctx, 67.0 MMTEB, 71.7 MTEB English) and -nano (239M, 768-dim, MRL 32-768, 8K ctx), released 18 Feb 2026 under CC-BY-NC-4.0 — [Jina v5 small](https://jina.ai/models/jina-embeddings-v5-text-small/); [Elastic blog](https://www.elastic.co/search-labs/blog/jina-embeddings-v5-text); [HF nano](https://huggingface.co/jinaai/jina-embeddings-v5-text-nano)
- Elastic acquisition closed 2025-10-09 — [usagepricing tracker](https://usagepricing.com/blueprint/activity/2025-10-09-jina-ai-elastic-acquisition); [Elastic Jina integration](https://www.elastic.co/search-labs/integrations/jina)

**BGE-M3 (BAAI)**: MIT, 1024-dim dense, 8,192 tokens, dense + sparse (lexical weights) + multi-vector (ColBERT) outputs, 100+ languages; Matryoshka not mentioned; paper 5 Feb 2024 — [HF card](https://huggingface.co/BAAI/bge-m3)

**Snowflake arctic-embed-l-v2.0**: Apache-2.0, XLM-RoBERTa based, 74 languages tagged — [HF card](https://huggingface.co/Snowflake/snowflake-arctic-embed-l-v2.0); 1024-dim default with 256 allowed, 8,192 tokens, BEIR 55.6 / MIRACL 55.8 (568M params, 303M non-embedding) — [Weaviate model list](https://docs.weaviate.io/cloud/embeddings/models); [Docker Hub listing](https://hub.docker.com/r/aistaging/snowflake-arctic-embed-l-v2-vllm). Snowflake/third parties claim <3% loss at 256 dims — [PromptLayer](https://www.promptlayer.com/models/snowflake-arctic-embed-l-v20)

**IBM Granite-embedding-english-r2**: 149M params (ModernBERT-base design), 768-dim, 8,192 tokens, trained on English text and code, evaluated on CoIR, Apache-2.0; a 47M "small" variant and a reranker in the same release; paper arXiv 2508.21085 (Aug 2025). A multilingual R2 paper (arXiv 2605.13521) also exists — [arXiv 2508.21085](https://arxiv.org/html/2508.21085v1); [HF small r2](https://huggingface.co/ibm-granite/granite-embedding-small-english-r2); [HF blog](https://huggingface.co/blog/hansolosan/granite-embedding-r2)

### Inferences
- 768 is a good fixed schema width: it is native for EmbeddingGemma, nomic v1.5/v2, Granite r2 and jina-v5-nano, and an MRL size for Qwen3-Embedding-0.6B and both Gemini embedding models. A model swap therefore needs re-embedding and a new space ID, but no column-type change. Equal width does not imply compatibility (Google states this explicitly for its own two models, see Q2).
- Each model needs its own prompt/prefix and normalisation recipe (nomic `search_query:`; EmbeddingGemma/Gemini-2 `task: search result | query:`; Qwen3/harrier `Instruct: ...\nQuery:` on queries only). The "embedding space" table should record model ID, revision, dimensions, truncation, normalisation, query and document templates, not just the model name.
- Best quality-per-size for a CPU server at 768: Qwen3-Embedding-0.6B truncated to 768 (MMTEB 64.33 at 1024; truncated score not published) vs EmbeddingGemma 768 (61.15) — EmbeddingGemma is half the parameters and has published QAT int4/int8 checkpoints; Qwen3 has 32K context (useful for README excerpts) and Apache-2.0.
- Truncating to 256 costs EmbeddingGemma about 1.5 points multilingual and 2 points on code while cutting vector bytes by 3x (see Q4 sizes); this is a credible fallback if the 500 MB cap bites.
- nomic-embed-text-v2-moe's 512-token context is too short for README excerpts without chunking; nomic-embed-code (7B) is too heavy for free/CPU hosting.
- harrier-oss-v1-270m's native 640-dim would not fit a 768 schema; its 78% "zero-shot" figure suggests some MTEB-domain training data, so leaderboard rank may overstate generalisation.
- Jina v4/v5/code models are non-commercial or research-licensed; avoid self-hosting them for a public product without a commercial licence.

### Gaps
- No published MTEB scores for Qwen3-Embedding-0.6B truncated to 768 or 256.
- No reliable x86 CPU throughput numbers (docs/sec) for EmbeddingGemma, Qwen3-0.6B or Granite r2 found; needs a local benchmark on the target server.
- "mixedbread mxbai embed v2": no v2 embedding model found; only mxbai-embed-large-v1 (Apache-2.0, via Ollama) surfaced. Mixedbread's 2025 v2 releases are rerankers (Q3).
- Snowflake arctic-embed-m-v2.0 (believed 768-dim) specs not verified from a primary source this session.
- No independent benchmark on GitHub-repository retrieval (description + topics + README) specifically; SEFGH should build a small labelled evaluation set.
- Availability of EmbeddingGemma/Qwen3-Embedding in the Ollama library not verified this session.

## Q2. Hosted embeddings and free tiers

### Takeaway
Embedding the whole corpus is cheap everywhere (single-digit dollars for tens of millions of tokens). Google's current model is Gemini Embedding 2 (GA April 2026, $0.20/M text tokens, $0.10 batch, free tier with data used to improve products); gemini-embedding-001 remains ($0.15/M; shutdown listed for 14 May 2028) and its vector space is incompatible with Gemini Embedding 2. Cloudflare Workers AI offers Qwen3-Embedding-0.6B and BGE-M3 at $0.012/M tokens with a 10,000-neuron daily free allowance; Voyage gives 200M free tokens on its 4-series.

### Cited Findings
- Gemini API embedding models: `gemini-embedding-2` (stable, newest; text/image/video/audio/PDF; 8,192-token input; 128-3072 dims, recommended 768/1536/3072; default 3072; automatic normalisation of truncated outputs; no `task_type`, uses prompt prefixes like `task: search result | query: ...` and `title: ... | text: ...`; multiple inputs in one request are aggregated into one embedding; latest update April 2026) and `gemini-embedding-001` (text only, 2,048 tokens, 128-3072 dims, `task_type` incl. RETRIEVAL_QUERY/RETRIEVAL_DOCUMENT/CODE_RETRIEVAL_QUERY, manual normalisation needed except at 3072, latest update June 2025). The two spaces are "incompatible"; upgrading requires re-embedding all data — [Gemini embeddings docs](https://ai.google.dev/gemini-api/docs/embeddings)
- gemini-embedding-001 MTEB by dimension: 68.16 @2048, 68.17 @1536, 67.99 @768, 67.55 @512, 66.19 @256, 63.31 @128 — [Gemini embeddings docs](https://ai.google.dev/gemini-api/docs/embeddings)
- Gemini Embedding 2 pricing (Gemini API): text input free on Free Tier; Paid $0.20/M tokens; Batch $0.10/M (batch not available on Free Tier). Free Tier content is used to improve Google products; Paid Tier content is not — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Gemini Embedding 2 public preview 10 Mar 2026, GA announced ~22 Apr 2026 on Gemini API and Vertex AI — [NYU Shanghai RITS](https://rits.shanghai.nyu.edu/ai/google-launches-gemini-embedding-2-its-first-multimodal-embedding-model/); [model page](https://ai.google.dev/gemini-api/docs/models/gemini-embedding-2)
- gemini-embedding-001 GA at $0.15 per 1M input tokens — [Google Developers Blog](https://developers.googleblog.com/en/gemini-embedding-available-gemini-api/). Deprecations table lists release 14 Jul 2025 and shutdown 14 May 2028 (replacement gemini-embedding-2); an older cached copy said 14 Jul 2026 — [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations) (via search snippets; live page not loaded)
- Free-tier limits for gemini-embedding-001 reported by a forum moderator as 100 RPM / 30k TPM / 1k RPD (unofficial) — [Google AI forum](https://discuss.ai.google.dev/t/gemini-embedding-free-tier-documentation/112553). The official rate-limit page does not list free RPM/TPM/RPD (points to AI Studio); Batch enqueued-token limits for "Gemini Embedding": Tier 1 500,000, Tier 2 5,000,000, Tier 3 10,000,000 — [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- Vertex AI: third-party listings give gemini-embedding-001 ~$0.15/M online and ~$0.075/M batch; text-embedding-005 ~$0.000025 per 1,000 characters (units inconsistent across sources) — [CostBench](https://www.costbench.com/software/embedding-apis/vertex-ai-embeddings/); [DevelopersDigest](https://www.developersdigest.tech/models/embeddings/google-gemini-embedding-001)
- Cloudflare Workers AI: 10,000 neurons/day free; $0.011 per 1,000 neurons on Workers Paid. Per 1M input tokens: @cf/qwen/qwen3-embedding-0.6b $0.012, @cf/baai/bge-m3 $0.012, @cf/pfnet/plamo-embedding-1b $0.019, bge-small-en-v1.5 $0.020, bge-base-en-v1.5 $0.067, bge-large-en-v1.5 $0.204; reranker @cf/baai/bge-reranker-base $0.003. No EmbeddingGemma listed — [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- Voyage AI (official page): voyage-4-large $0.12/M, voyage-4 $0.06/M, voyage-4-lite $0.02/M, voyage-context-4 and voyage-code-4 $0.12/M, each with 200M free tokens; older voyage-code-3 / voyage-3-large $0.18/M and voyage-3.5 $0.06/M with no free tokens; Batch API 33% discount, free tokens not applicable to batch — [Voyage pricing](https://docs.voyageai.com/docs/pricing)
- OpenAI: text-embedding-3-small $0.02/M, text-embedding-3-large $0.13/M, ada-002 $0.10/M — [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- Jina API: new keys get 10M free tokens for non-commercial use, one-time grant; paid pricing reported inconsistently ($0.02-$0.05/M) by third parties — [Elastic Jina integration](https://www.elastic.co/search-labs/integrations/jina); [markaicode](https://markaicode.com/pricing/jina-ai-pricing/)
- Supabase Edge Functions have one built-in embedding model, `gte-small` (English only, truncates at 512 tokens); larger models need a self-managed Ollama/Llamafile host — [Supabase AI models](https://supabase.com/docs/guides/functions/ai-models); gte-small is 384-dim per Supabase's compute benchmark — [Supabase compute guide](https://supabase.com/docs/guides/ai/choosing-compute-addon)

### Inferences
- Cost example (estimate): 50,000 repositories x 1,500 tokens = 75M tokens. Gemini Embedding 2 ≈ $15 ($7.50 batch); gemini-embedding-001 ≈ $11.25; OpenAI 3-small ≈ $1.50; Cloudflare Qwen3-0.6B ≈ $0.90; Voyage-4-lite $0 within 200M free tokens. $300 of Google credits covers ~1.5B tokens of Gemini Embedding 2 — far beyond need.
- Cloudflare's free 10,000 neurons/day ≈ 9M tokens/day for Qwen3-Embedding-0.6B or BGE-M3 (10,000 / (0.012/0.011 x 1,000) neurons per M tokens; estimate), i.e. several thousand repository documents per day free.
- Same open model, two hosts: Qwen3-Embedding-0.6B is available both on Cloudflare Workers AI and as Apache-2.0 weights for the later physical server, which keeps one embedding space across hosted and self-hosted phases (verify Cloudflare's model revision, pooling and MRL handling match before mixing).
- Gemini Free Tier is a privacy issue for query embeddings: user search text sent on the free tier may be used to improve Google products. Repository documents are public; user queries are not. Use the paid tier (credits) or a self-hosted model for queries.
- Gemini Embedding 2 aggregates multiple inputs in one request into one embedding — batching code written for 001 (one embedding per string) would silently change meaning.
- Gemini Embedding 2 and EmbeddingGemma share a prompt format, but Google documents no space compatibility between any two of its models; treat them as separate spaces.

### Gaps
- Official Vertex AI embedding prices (page did not load; units disagree in third-party sources) and whether the $300 trial credits apply to Gemini API billing vs Vertex AI only, and their expiry, were not verified.
- Official free-tier RPM/TPM/RPD for gemini-embedding-2 not published on the docs page (AI Studio only).
- Hugging Face Inference Providers embedding pricing/free credits not researched.
- Voyage free-account rate limits not on the pricing page.

## Q3. Rerankers and late interaction

### Takeaway
Good open rerankers now exist at 0.6B parameters, but published numbers show a small reranker can make code-style retrieval worse than the embedding alone (Qwen3-Reranker-0.6B and bge-reranker-v2-m3 both score below the Qwen3-Embedding-0.6B baseline on MTEB-Code). At tens of thousands of repositories with hybrid RRF, a reranker is optional and should be added only if an evaluation set shows a gain; hosted per-search pricing (Cohere ~$2 per 1,000 searches, Voyage rerank-3-lite $0.02/M tokens) is cheap for low traffic. Late interaction (ColBERT) is not feasible inside a 500 MB Supabase database.

### Cited Findings
- Qwen3-Reranker (Apache-2.0, 32K context), reranking top-100 from Qwen3-Embedding-0.6B: 0.6B MTEB-R 65.80 / MMTEB-R 66.36 / MTEB-Code 73.42; 4B 69.76 / 72.74 / 81.20; 8B 69.02 / 72.94 / 81.22; bge-reranker-v2-m3 57.03 / 58.36 / 41.38; jina-multilingual-reranker-v2-base 58.22 / 63.73 / 58.98; gte-multilingual-reranker-base 59.51 / 59.44 / 54.18; embedding-only baseline Qwen3-Embedding-0.6B 61.82 / 64.64 / 75.41 — [Qwen3-Reranker-0.6B card](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B)
- jina-reranker-v3: 0.6B listwise, CC-BY-NC-4.0 (commercial use requires contacting Jina), 131K context, up to 64 documents per call; BEIR 61.94, MIRACL 66.83, CoIR 70.64. Same table: mxbai-rerank-large-v2 (1.5B) BEIR 61.44 / CoIR 70.87; mxbai-rerank-base-v2 (0.5B) 58.40 / 65.71; Qwen3-Reranker-4B 61.16 / 73.91; Qwen3-Reranker-0.6B 56.28 / 65.18; bge-reranker-v2-m3 56.51 / 36.28; jina-reranker-m0 (2.4B) 58.95 / 63.55; paper 29 Sep 2025 — [jina-reranker-v3 card](https://huggingface.co/jinaai/jina-reranker-v3)
- jina-reranker-v3.5 (August 2026): 0.6B listwise, BEIR 63.20, 1.22-1.56x faster than v3, CC-BY-NC-4.0 — [Jina v3.5 news](https://jina.ai/news/jina-reranker-v3-5-faster-listwise-reranking-hybrid-attention-self-distillation); [model page](https://jina.ai/models/jina-reranker-v3.5/)
- mxbai-rerank-large-v2: Apache-2.0; vendor BEIR 57.49 vs cohere-rerank-3.5 55.39 and voyage-rerank-2 54.54; 0.89 s per query on an A100 (vendor) — [Mixedbread docs](https://mixedbread.com/docs/models/reranking/mxbai-rerank-large-v2); [Mixedbread blog](https://mixedbread.com/blog/mxbai-rerank-v2)
- Cohere Rerank 4 Fast $2.00 per 1,000 searches, Rerank 4 Pro $2.50 per 1,000 (launched 6 Apr 2026); Rerank 3.5 $0.001/search; a search = 1 query + up to 100 documents, documents >500 tokens split into chunks (third-party sources) — [Puter Cohere pricing](https://developer.puter.com/tutorials/cohere-api-pricing/); [OpenRouter rerank-4-fast](https://openrouter.ai/cohere/rerank-4-fast)
- Voyage rerank-3 $0.05/M tokens, rerank-3-lite $0.02/M, 200M free tokens (page inconsistent about which rerankers get free tokens) — [Voyage pricing](https://docs.voyageai.com/docs/pricing)
- Cloudflare @cf/baai/bge-reranker-base $0.003/M input tokens — [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- BGE-M3 can output ColBERT multi-vectors; jina-embeddings-v4 has a 128-dim multi-vector mode — [BGE-M3 card](https://huggingface.co/BAAI/bge-m3); [jina-v4 card](https://huggingface.co/jinaai/jina-embeddings-v4)
- ColBERT scoring is the sum over query tokens of the max similarity to document tokens ("MaxSim") — [ColBERTv2 paper](https://arxiv.org/pdf/2112.01488). VectorChord documents ColBERT reranking in PostgreSQL and notes token-level late interaction needs more compute and storage — [VectorChord ColBERT rerank](https://docs.vectorchord.ai/vectorchord/use-case/colbert-rerank.html). vLLM serves jina-colbert-v2 — [vLLM ColBERT](https://docs.vllm.ai/en/stable/api/vllm/model_executor/models/colbert/)

### Inferences
- Is a reranker worth it? Not at launch. RRF over HNSW + full-text at tens of thousands of documents is a strong baseline; the evidence above shows small cross-encoders can lose to the embedding on code/technical text. Recommended order: build an evaluation set (queries with known-good repositories), measure hybrid RRF, then test a reranker on the top 20-50.
- If a reranker is added: Qwen3-Reranker-0.6B or mxbai-rerank-base-v2 (Apache-2.0, self-hostable) or a hosted pay-per-use API. Hosted cost at 10,000 searches/month ≈ $20 (Cohere Rerank 4 Fast) or cents (Voyage rerank-3-lite with ~50 docs x 300 tokens per search ≈ 150M tokens/month at $0.02/M ≈ $3, less inside free tokens) — estimates.
- CPU latency estimate: a 0.6B cross-encoder scoring 50 documents x ~300 tokens (≈15k tokens) per query is likely seconds on a small CPU server, so self-hosted reranking needs a GPU or a cache; not measured.
- Late interaction storage estimate: ~512 tokens x 128-dim halfvec (≈264 B each) ≈ 135 KB per repository, ≈4 GB for 30,000 repositories — about 8x the entire 500 MB Supabase database. Also pgvector has no MaxSim operator and VectorChord is not confirmed on Supabase. Feasible only on a self-hosted server or a dedicated engine.
- Non-commercial licences (Jina rerankers v3/v3.5) rule them out for self-hosting in a public product without a licence; their API use is a separate commercial agreement.

### Gaps
- Licence of bge-reranker-v2-m3 not verified this session (believed Apache-2.0).
- Cohere's own pricing page and free trial-key limits not fetched (figures from resellers/aggregators).
- Vertex AI Ranking API price not verified.
- No measured CPU latency for any reranker found.

## Q4. Postgres, pgvector and Supabase: vector and hybrid search today

### Takeaway
pgvector 0.8.x supports everything the design needs: `halfvec` (2 bytes/dim, HNSW up to 4,000 dims), binary quantisation with re-ranking, sparse vectors and iterative index scans for filtered queries. The latest release is 0.8.7 (1 Oct 2026); 0.9.0 is unreleased. Supabase's installed 0.8.0 predates several 2026 HNSW fixes. Supabase's documented hybrid search uses tsvector + HNSW + RRF (k=50) in one SQL function. True BM25 extensions (Tiger Data pg_textsearch, ParadeDB pg_search) exist but neither is confirmed available on Supabase.

### Cited Findings
- Storage per value: `vector` 4 x dims + 8 bytes; `halfvec` 2 x dims + 8; `bit` dims/8 + 8; `sparsevec` 8 x non-zero + 16. HNSW index limits: vector 2,000 dims, halfvec 4,000, bit 64,000, sparsevec 1,000 non-zero. HNSW defaults m=16, ef_construction=64, `hnsw.ef_search`=40 — [pgvector README](https://github.com/pgvector/pgvector/blob/master/README.md)
- Iterative index scans (0.8.0): `hnsw.iterative_scan` = `strict_order` or `relaxed_order`; `hnsw.max_scan_tuples` default 20,000; `hnsw.scan_mem_multiplier` default 1. Without them, a filter matching 10% of rows with ef_search 40 returns ~4 rows on average. Partial indexes for few filter values, partitioning for many — [pgvector README](https://github.com/pgvector/pgvector/blob/master/README.md)
- Binary quantisation pattern: HNSW expression index on `binary_quantize(embedding)::bit(n)` with `bit_hamming_ops`, take top 20 by Hamming, re-rank by cosine on the original vectors. Half-precision indexing via an expression index on `embedding::halfvec(n)`. Hybrid search: combine with `plainto_tsquery`/`ts_rank_cd` and merge with RRF or a cross-encoder. HNSW builds are much faster when the graph fits in `maintenance_work_mem`; create indexes after the initial load — [pgvector README](https://github.com/pgvector/pgvector/blob/master/README.md)
- Changelog: 0.7.0 (2024-04-29) added halfvec, sparsevec, bit indexing, binary_quantize; 0.8.0 (2024-10-30) iterative scans, better filtered-query cost estimation, faster HNSW scans/inserts; 0.8.1 (2025-09-04) Postgres 18 support, faster binary_quantize; 0.8.2 (2026-02-25) "Fixed buffer overflow with parallel HNSW index build"; 0.8.3 (2026-06-17) "Fixed possible index corruption with HNSW vacuuming"; 0.8.4 (2026-06-30) fixed "hnsw graph not repaired" error and insert errors during HNSW vacuuming; 0.8.5-0.8.7 (to 2026-10-01) IVFFlat fixes. 0.9.0 (unreleased): asynchronous I/O for HNSW, `vector_dims` for sparsevec, drops Postgres 13 and 14 — [pgvector CHANGELOG](https://github.com/pgvector/pgvector/blob/master/CHANGELOG.md)
- Supabase hybrid search guide: `hybrid_search(query_text, query_embedding, match_count, full_text_weight=1, semantic_weight=1, rrf_k=50)`; GIN index on the tsvector column, HNSW on the embedding (`vector_ip_ops` with `<#>`); `ts_rank_cd` cannot use an index; query embedding must come from the same model and dims; results capped at `least(match_count, 30)`, each method contributes up to 2x that; no BM25 — [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search)
- Supabase automatic embeddings (launched 1 Apr 2025): triggers enqueue jobs into pgmq, pg_cron drains the queue, pg_net calls an Edge Function that calls the embedding provider, with retries and an inspectable queue — [Supabase guide](https://supabase.com/docs/guides/ai/automatic-embeddings); [Supabase blog](https://supabase.com/blog/automatic-embeddings)
- Supabase Vector Buckets (alpha, announced Dec 2025): hosted on Amazon S3 Vectors; 10 buckets/project, 10 indexes/bucket, up to 4,096 dims, 1,000 vectors per write, topK up to 10,000 with max 100 results per response — [Supabase vector limits](https://supabase.com/docs/guides/storage/vector/limits); ~50M vectors per index reported; Supabase positions pgvector for hot vectors and Vector Buckets for warm/cold — [letsdatascience](https://letsdatascience.com/news/supabase-launches-vector-buckets-for-large-scale-vectors-1ef11d7c); [Amazon press release](https://press.aboutamazon.com/2025/12/supabase-and-aws-empower-app-developers-to-build-in-a-weekend-scale-to-millions). Free-plan availability and pricing not stated on the fetched pages.
- Supabase free plan: 500 MB database per project, pause after one week inactive, 2 active projects, 500,000 Edge Function invocations/month, 5 GB egress, 1 GB file storage; Pro from $25/month with 8 GB disk included, $0.125/GB beyond, $10 compute credits — [Supabase pricing](https://supabase.com/pricing). Free "Nano" compute: shared CPU, up to 0.5 GB RAM, 60 connections; Micro: 1 GB RAM, ~$10/month — [Supabase compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- Supabase HNSW benchmarks (recall 0.99): Micro (1 GB RAM) handled 30,000 x 960-dim vectors at 430 QPS (p95 34 ms, ef_search 65, RAM 1.2 GB with swap), 100,000 x 384-dim at 580 QPS, 15,000 x 1,536-dim at 480 QPS — [Supabase choosing compute](https://supabase.com/docs/guides/ai/choosing-compute-addon). HNSW builds can create temporary files of a few GB; build over psql because the dashboard times out after ~2 minutes — [Supabase HNSW troubleshooting](https://supabase.com/docs/guides/troubleshooting/increase-vector-lookup-speeds-by-applying-an-hsnw-index-ohLHUM)
- Tiger Data pg_textsearch: BM25 extension, open-sourced under the PostgreSQL License in Dec 2025; v1.0 GA 3 Apr 2026 with disk-based segments and Block-Max WAND; `<@>` operator; 29+ languages; index stored in normal Postgres pages — [PostgreSQL.org news](https://www.postgresql.org/about/news/pg_textsearch-v10-3264); [Tiger Data blog](https://www.tigerdata.com/blog/introducing-pg_textsearch-true-bm25-ranking-hybrid-retrieval-postgres); [It's FOSS](https://itsfoss.com/news/tiger-data-pg-textsearch/)
- ParadeDB pg_search: AGPL-3.0, latest 0.25.2 (2026-08-11), needs Postgres 15+; Supabase's partner page integrates it by running ParadeDB separately and syncing via logical replication, not as an in-database extension — [PGXN meta](https://master.pgxn.org/dist/pg_search/0.25.2/META.json); [Supabase ParadeDB partner page](https://supabase.com/partners/paradedb)
- No Supabase announcement adding pg_textsearch or pg_search was found; Supabase's extensions page does not list extensions individually — [Supabase extensions](https://supabase.com/docs/guides/database/extensions)

### Inferences
- Size per vector (from the formulas; excludes ~24-28 bytes row/item overhead): vector(768) 3,080 B; halfvec(768) 1,544 B; bit(768) 104 B; vector(256) 1,032 B; halfvec(256) 520 B; bit(256) 40 B; halfvec(1024) 2,056 B.
- HNSW size estimate (not measured): each element stores the vector plus about 2m neighbour pointers at layer 0 (~32 x 6 B with m=16) plus page overhead, so roughly 1.8-2.0 KB per halfvec(768) element and ~0.7 KB per halfvec(256). For 30,000 repositories: halfvec(768) heap ~48 MB + HNSW ~57 MB ≈ 105 MB; halfvec(256) ≈ 40 MB total. Measure with `pg_relation_size` / `pg_indexes_size` on real data.
- The design's "~8-10 KB per repository" is plausible once tsvector, its GIN index, document text and metadata are included; 30-40k repositories fit 500 MB with headroom; 50k would sit at the limit. Dropping to halfvec(256) saves ~2.3 KB per repository.
- Nano has up to 0.5 GB RAM; Supabase's Micro (1 GB) benchmark already swaps at 30k x 960-dim. An HNSW index of ~57 MB should fit in memory on Nano, but this is unbenchmarked; keep `ef_search` modest and test.
- Binary quantisation (bit(768) = 104 B) with a halfvec re-rank is a further option if storage is tight, at a recall cost the README handles by re-ranking top-k.
- Iterative scans (`relaxed_order`) are relevant when the RRF function filters by language/topic/stars; without them filtered HNSW can return too few rows.
- Supabase's 0.8.0 predates the 2026 HNSW vacuum-corruption fix (0.8.3) and the parallel-build overflow fix (0.8.2). Check `select extversion from pg_extension where extname = 'vector'` and whether `ALTER EXTENSION vector UPDATE` is offered; until then, consider single-worker index builds and periodic `REINDEX` after heavy delete/vacuum churn (precaution, not documented advice).
- On Supabase today, the keyword side of hybrid search is built-in tsvector + `ts_rank_cd` (or pg_trgm for fuzzy names); true BM25 requires leaving Supabase (self-hosted Postgres with pg_textsearch, PostgreSQL License) or a ParadeDB replica (AGPL).
- Supabase's example caps results at 30 and uses k=50; SEFGH's function should make k, weights and candidate depth configuration, recorded alongside the embedding space.
- Vector Buckets are alpha and not documented for the free plan; not suitable as the primary index now.

### Gaps
- Exact list of extensions on SEFGH's Supabase project (pg_textsearch, VectorChord, pgvectorscale) not verifiable from docs; run `select name, default_version from pg_available_extensions`.
- Whether Supabase offers pgvector newer than 0.8.0 on Postgres 17 projects not confirmed.
- Supabase Nano `shared_buffers`/`maintenance_work_mem` defaults not found.
- Vector Buckets free-plan availability and pricing not documented on fetched pages.

## Q5. Options if the corpus outgrows the free database

### Takeaway
The cheapest growth path that keeps the single SQL function is Postgres: Supabase Pro ($25/month, 8 GB disk) or a self-hosted Postgres with current pgvector and BM25 on the planned small server. Free dedicated vector stores are small (Qdrant Cloud free: 1 GB RAM / 4 GB disk; Cloudflare Vectorize free: 5M stored dimensions ≈ 6,500 vectors at 768) and split search across systems. Neon's free plan now gives 1 GB per project; managed Google vector services cost hundreds of dollars per month.

### Cited Findings
- Qdrant Cloud free tier: 0.5 vCPU, 1 GB RAM, 4 GB disk, single node, free Cloud Inference for selected models; paid usage billed hourly by vCPU/RAM/storage — [Qdrant pricing](https://qdrant.tech/pricing/)
- Cloudflare Vectorize: Workers Free 5M stored vector dimensions and 30M queried dimensions/month; Workers Paid includes 10M stored and 50M queried, then $0.05 per 100M stored and $0.01 per 1M queried; example 10,000 x 768-dim vectors with 30,000 queries/month = $0 on Paid — [Vectorize pricing](https://developers.cloudflare.com/vectorize/platform/pricing/)
- Neon Free: 1 GB storage per project (20 GB total, up to 100 projects), 100 CU-hours per project, compute suspends after 5 minutes idle; pgvector supported; Launch plan $0.106/CU-hour and $0.35/GB-month, no minimum — [Neon pricing](https://neon.com/pricing)
- Turso: native vector column `F32_BLOB(n)` in libSQL/SQLite, approximate and exact search, DiskANN-based ANN index at scale; free-plan storage reported as 5 GB (two aggregators) or 9 GB (one) — [Turso vector](https://turso.tech/vector); [Turso blog](https://turso.tech/blog/turso-brings-native-vector-search-to-sqlite); [freetier.co](https://freetier.co/directory/products/turso); [AgentDeals](https://agentdeals.dev/database-pricing)
- LanceDB: open-source embedded core is Apache-2.0 and free to self-host; managed cloud reportedly folded into annual-commit Enterprise (Aug 2026), official pricing is contact-only — [usagepricing tracker](https://usagepricing.com/blueprint/activity/lancedb-2026-08-28-packaging); [LanceDB cloud page](https://lancedb.com/lp/cloud-pricing)
- Vertex AI Vector Search bills per node-hour; a third-party estimate puts a moderate 3-replica index at ~$700-800/month — [nOps](https://www.nops.io/blog/vertex-ai-pricing/)
- Supabase Pro: $25/month, 8 GB disk included, $0.125/GB beyond — [Supabase pricing](https://supabase.com/pricing); Supabase Micro benchmark: 100,000 x 384-dim HNSW at 580 QPS; Small (2 GB) 250,000 x 384-dim — [Supabase choosing compute](https://supabase.com/docs/guides/ai/choosing-compute-addon)
- Supabase Vector Buckets (alpha) scale to ~50M vectors per index on S3 Vectors — [Supabase vector limits](https://supabase.com/docs/guides/storage/vector/limits); [letsdatascience](https://letsdatascience.com/news/supabase-launches-vector-buckets-for-large-scale-vectors-1ef11d7c)

### Inferences
- Capacity estimates (not measured): Cloudflare Vectorize free = 5M / 768 ≈ 6,500 vectors (≈19,500 at 256 dims) — smaller than SEFGH's current target. On Workers Paid, 100,000 x 768 vectors (76.8M dims) cost ≈ $0.03/month storage; 1M queries/month (768M dims) ≈ $7.20/month.
- Qdrant free: 1 GB RAM holds roughly 250-300k float32 768-dim vectors before overhead (3 KB each), more with scalar/binary quantisation and on-disk originals — estimate; Qdrant does not publish a vector count on the pricing page.
- Neon free 1 GB per project is double Supabase's 500 MB and keeps pgvector + tsvector RRF unchanged, but auth/storage stay on Supabase, so it splits the stack; check which pgvector version Neon runs.
- Self-hosted Postgres on the planned server (pgvector 0.8.7, pg_textsearch BM25, optional VectorChord) gives the most headroom and the newest fixes for zero licence cost; a 4-8 GB RAM box fits several hundred thousand halfvec(768) rows with HNSW in memory (extrapolated from Supabase's tables).
- Vertex AI Vector Search / AlloyDB would consume the $300 credits in weeks; not suitable for the budget.
- Splitting vectors into an external store breaks the "one SQL function" RRF design and adds a second consistency problem; prefer staying in Postgres until well past 100k repositories.

### Gaps
- Qdrant free-cluster inactivity/suspension policy not on the pricing page.
- Official Turso pricing page not fetched; free storage figures conflict.
- AlloyDB (and AlloyDB Omni) pricing and Google Cloud credit expiry not researched.
- Cloudflare Workers Paid base price not verified this session.
- No measured capacity for any option with SEFGH's actual documents; needs a load test.
