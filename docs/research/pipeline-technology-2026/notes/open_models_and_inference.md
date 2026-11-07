# Open-weight LLMs, free or cheap inference, and provider switching for SEFGH repository summaries

Research date: 2026-10-26. Scope: models that read a README + file tree + package manifests (~3,000 input tokens) and return a short summary, labels/topics and structured JSON (~300 output tokens), for ~20,000 repositories. Model facts were checked against Hugging Face Hub metadata (creation date, licence tag and parameter count, read through the Hub API this session) and against model cards. Prices and limits come from the vendors' own pages where those pages would load. Where only third-party pages were available, this is marked. "Estimate" marks my own arithmetic.

## Which open-weight model families are current as of late 2026, and which suit the task at small, medium and large sizes?

### Takeaway
By October 2026 the active, permissively licensed families for this task are **Qwen3.5 / Qwen3.6 / Qwen3.8** (Apache-2.0, 0.8B to 27B dense plus MoE, 262K context), **Gemma 4** (Apache-2.0 since April 2026: E2B, E4B, 12B, 26B-A4B, 31B), **gpt-oss-20b/120b** (Apache-2.0, Aug 2025, still the default "cheap and fast" hosted model at Groq, Cerebras and Cloudflare) and **IBM Granite 4.2** (Apache-2.0, 3B/8B/30B, Sep 2026). DeepSeek V4.x (MIT), GLM-5.x (MIT, some "other"), Kimi K2.x/K3 (custom) and Mistral Small 4 / Medium 3.5 are frontier-sized and practical only through hosted APIs. Llama 4 (April 2025) and Phi-4 (2024/25) are stale. For one consumer GPU, the realistic candidates are Qwen3.5-4B/9B, Gemma 4 E4B/12B, Granite 4.2 3B/8B and gpt-oss-20b. For a hosted mid-size model, they are Qwen3.8-27B, Gemma 4 26B-A4B and gpt-oss-120b.

### Cited Findings

**Qwen (Alibaba)**
- The Qwen3.5 instruct models were created on the Hub between 16 and 28 Feb 2026. Dense sizes are 0.8B, 2B, 4B, 9B and 27B; MoE sizes are 35B-A3B, 122B-A10B and 397B-A17B. All are tagged Apache-2.0, and official GPTQ-Int4 builds followed on 3 Mar 2026. — [HF Qwen/Qwen3.5-4B](https://hf.co/Qwen/Qwen3.5-4B), [HF Qwen/Qwen3.5-397B-A17B](https://hf.co/Qwen/Qwen3.5-397B-A17B), [HF Qwen/Qwen3.5-27B-GPTQ-Int4](https://hf.co/Qwen/Qwen3.5-27B-GPTQ-Int4)
- Qwen3.5-4B has a native context of 262,144 tokens, extensible to about 1,010,000 with YaRN. Thinking is on by default; turn it off with `chat_template_kwargs: {"enable_thinking": false}` in vLLM or SGLang, because the Qwen3 `/think` and `/nothink` switches are no longer supported. Its scores are IFEval 89.8, MMLU-Pro 79.1, MMLU-Redux 88.8, GPQA-Diamond 76.2 and LiveCodeBench v6 55.8. Licence: Apache-2.0. — [Qwen3.5-4B model card](https://huggingface.co/Qwen/Qwen3.5-4B)
- Qwen3.5-9B has 9.65B parameters including the vision encoder, an Apache-2.0 licence and Hub creation date 27 Feb 2026. It is served by Together, Featherless, OVHcloud and DeepInfra through HF Inference Providers. — [HF Qwen/Qwen3.5-9B](https://hf.co/Qwen/Qwen3.5-9B)
- Qwen3.6-35B-A3B (15 Apr 2026) and Qwen3.6-27B (21 Apr 2026) are Apache-2.0, with FP8 variants. — [HF Qwen/Qwen3.6-35B-A3B](https://hf.co/Qwen/Qwen3.6-35B-A3B), [HF Qwen/Qwen3.6-27B](https://hf.co/Qwen/Qwen3.6-27B)
- Qwen3.8-27B (Hub creation 5 Aug 2026, citation "August 2026") is Apache-2.0. Context is 262,144 native and 1M with YaRN. Thinking is on by default (`enable_thinking: False` turns it off) and `reasoning_effort` takes xhigh/medium/low. Recommended serving is SGLang, vLLM or TokenSpeed, with community GGUFs for llama.cpp, Ollama and LM Studio. Against Qwen3.6-27B it scores LiveCodeBench v6 90.3 vs 83.9, SWE-bench Pro 61.7 vs 53.5 and IFBench 79.5 vs 69.1. — [Qwen3.8-27B model card](https://huggingface.co/Qwen/Qwen3.8-27B)
- Qwen3.8-27B is live on HF Inference Providers through Novita, Cerebras, Featherless, OVHcloud and DeepInfra. — [HF Qwen/Qwen3.8-27B](https://hf.co/Qwen/Qwen3.8-27B)
- Qwen3.8-Flash-Next (180B, 24 Aug 2026) and Qwen3.8-2.4T-A95B (8 Aug 2026) carry the licence tag "other", not Apache-2.0. — [HF Qwen/Qwen3.8-Flash-Next](https://hf.co/Qwen/Qwen3.8-Flash-Next), [HF Qwen/Qwen3.8-2.4T-A95B](https://hf.co/Qwen/Qwen3.8-2.4T-A95B)
- Gap: I did not find a Qwen3.8 release at 0.8B–9B. In the Qwen org listing sorted by date, the newest small Qwen LLMs are still Qwen3.5 (Feb 2026). — [HF Qwen org listing](https://huggingface.co/Qwen)
- Gap: I found no 2026 Qwen3-Coder successor. Qwen3-Coder (2025) still appears in third-party pricing tables. — [anotherwrapper pricing](https://anotherwrapper.com/tools/llm-pricing/gpt-oss-20b/qwen3.5-122b-a10b)

**Gemma (Google)**
- Gemma 4 was released on 2 Apr 2026 under Apache-2.0, replacing the custom Gemma Terms of Use. These sources are secondary news reports. — [Techzine](https://techzine.eu/news/applications/140206/google-launches-gemma-4-with-a-broad-licensing-model), [DataNorth](https://datanorth.ai/news/google-releases-gemma-4-open-models), [Wikipedia](https://en.wikipedia.org/wiki/Gemma_(language_model))
- Official model card, by size:
  - E2B: 2.3B effective parameters (5.1B with embeddings), 128K context.
  - E4B: 4.5B effective (8B with embeddings), 128K context.
  - 12B "Unified": 11.95B, 256K context.
  - 26B-A4B MoE: 25.2B total, 3.8B active, 256K context.
  - 31B dense: 30.7B, 256K context.
  - All sizes have native function calling and a thinking mode, switched on with `<|think|>` in the system prompt.
  - MMLU-Pro, E2B to 31B: 60.0 / 69.4 / 77.2 / 82.6 / 85.2.
  - LiveCodeBench v6, E2B to 31B: 44.0 / 52.0 / 72.0 / 77.1 / 80.0.
  - The card does not state IFEval scores or structured-output support.
  - [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4). The page now says it is deprecated in favour of gemma.ai.
- Gemma 4 12B-it was created on the Hub on 23 May 2026, later than the first four sizes. Google publishes official QAT `q4_0` GGUFs for E2B, E4B, 26B-A4B and 31B (1 May 2026) and for 12B (5 Jun 2026), all Apache-2.0. — [HF google/gemma-4-12B-it](https://hf.co/google/gemma-4-12B-it), [HF google/gemma-4-E4B-it-qat-q4_0-gguf](https://hf.co/google/gemma-4-E4B-it-qat-q4_0-gguf), [HF google/gemma-4-12B-it-qat-q4_0-gguf](https://hf.co/google/gemma-4-12B-it-qat-q4_0-gguf)
- The Gemini API pricing page lists "Gemma 4" as free for input and output, with the paid tier "Not available". — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

**OpenAI gpt-oss**
- gpt-oss-20b (20.9B) and gpt-oss-120b were created on the Hub on 4 Aug 2025 under Apache-2.0, with MXFP4 weights. gpt-oss-safeguard variants followed in Sep 2025. I found no newer gpt-oss LLM up to Oct 2026; OpenAI's 2026 Hub uploads are `privacy-filter` and `circuit-sparsity`. — [HF openai/gpt-oss-20b](https://hf.co/openai/gpt-oss-20b), [HF openai org listing](https://huggingface.co/openai)
- Artificial Analysis lists gpt-oss-20b with a 131K-token context, text in and out. — [Artificial Analysis gpt-oss-20b](https://artificialanalysis.ai/models/gpt-oss-20b)

**Meta Llama**
- The newest Meta LLM weights on the Hub are still Llama 4 Scout and Maverick (3–4 Apr 2025) and Llama Guard 4 (Apr 2025), under a custom licence (tag "other"). I found no Llama 4.x or Llama 5 open release. These are pre-2026 releases. — [HF meta-llama org listing](https://huggingface.co/meta-llama)

**Mistral**
- Mistral Small 4 (`Mistral-Small-4-119B-2603`, 119.4B parameters, Apache-2.0, Hub creation 23 Jan 2026, updated 15 Jul 2026) and Mistral Medium 3.5 128B (31 Mar 2026) are both large. Ministral 3 (3B, 8B and 14B, "2512" = Dec 2025) is the small line; Mistral's own 2026 fine-tunes such as Shieldstral 1.0 3B (Jul 2026) are built on it. — [HF mistralai/Mistral-Small-4-119B-2603](https://hf.co/mistralai/Mistral-Small-4-119B-2603), [HF mistralai/Shieldstral-1.0-3B](https://hf.co/mistralai/Shieldstral-1.0-3B), [Ollama ministral-3 library](https://ollama.com/library/ministral-3:latest/blobs/43070e2d4e53)
- The Ollama library ships the Apache-2.0 text as the licence file for Ministral 3. I did not check Mistral's own card. — [Ollama ministral-3](https://ollama.com/library/ministral-3:8b-instruct-2512-q4_K_M/blobs/43070e2d4e53)
- Gap: the 15 newest mistralai Hub repos include no 2026 Devstral or Magistral release. I did not check their 2026 status.

**DeepSeek, GLM, Kimi (hosted-only sizes)**
- DeepSeek: V4-Flash-0731 (31 Jul 2026), V4-Pro-0813 (13 Aug 2026), V4.1-Flash (10 Sep 2026, 763B parameters) and V4.1-Flash-1017 (17 Oct 2026), all MIT. — [HF deepseek-ai/DeepSeek-V4.1-Flash](https://hf.co/deepseek-ai/DeepSeek-V4.1-Flash)
- Z.ai GLM: GLM-5 (11 Feb 2026), 5.1 (3 Apr), 5.2 (16 Jun) and 5.3 / 5.3-Flash (25 Aug 2026). GLM-5.3-Flash has 321B parameters under MIT; GLM-5.3 is tagged "other". — [HF zai-org/GLM-5.3-Flash](https://hf.co/zai-org/GLM-5.3-Flash), [HF zai-org/GLM-5.3](https://hf.co/zai-org/GLM-5.3)
- Moonshot Kimi: K2.5 (1 Jan 2026), K2.6 (14 Apr), K2.7-Code (11 Jun) and K3 (13 Jun 2026, about 2.78T parameters), all with licence tag "other". Kimi-Linear-48B-A3B (Oct 2025) is MIT. — [HF moonshotai/Kimi-K3](https://hf.co/moonshotai/Kimi-K3), [HF moonshotai org listing](https://huggingface.co/moonshotai)

**Microsoft Phi, IBM Granite, NVIDIA Nemotron**
- Phi: the only 2026 Phi releases are Phi-4-reasoning-vision-15B (23 Jan 2026, MIT) and speech or GUI derivatives. Phi-4-mini-flash-reasoning and Phi-tiny/mini-MoE date from Jun 2025. I found no new Phi text instruct model in 2026, so treat this family as older. — [HF microsoft Phi listing](https://huggingface.co/microsoft/Phi-4-reasoning-vision-15B)
- Granite 4.2 comes in 3b (3.66B), 8b (8.79B) and 30b, Apache-2.0, tagged "reasoning, thinking, tool-calling" and covering 12 languages. MLX builds appeared on 1 Sep 2026 and the cards were updated on 20 Oct 2026. Granite Switch 4.1 8b/30b (14 Oct 2026) is a "decision-model" variant. — [HF ibm-granite/granite-4.2-8b](https://hf.co/ibm-granite/granite-4.2-8b), [HF ibm-granite/granite-4.2-3b](https://hf.co/ibm-granite/granite-4.2-3b), [HF ibm-granite/granite-switch-4.1-8b](https://hf.co/ibm-granite/granite-switch-4.1-8b)
- Nemotron: Nemotron 3.5 Super-VL 120B-A12B (12 Oct 2026), Bolt 74B-A9B including a "24GB" quantised variant (9–12 Oct 2026), and Nemotron-Labs Dory 1.0 4B (3.98B, 16 Oct 2026, with GGUF). All carry the NVIDIA licence tag "other". — [HF nvidia/NVIDIA-Nemotron-Labs-Dory1.0-4B-BF16](https://hf.co/nvidia/NVIDIA-Nemotron-Labs-Dory1.0-4B-BF16), [HF nvidia/NVIDIA-Nemotron-3.5-Bolt-74B-A9B-BF16](https://hf.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-74B-A9B-BF16)

**Independent comparison**
- Artificial Analysis small open models page (4B–40B, Intelligence Index v4.3.2):

  | Model | Index | Price | Speed (tok/s) |
  |---|---|---|---|
  | Qwen3.8 27B (xhigh) | 34 | $0.5 | 44 |
  | Qwen3.8 27B (non-reasoning) | 20 | $0.5 | 50 |
  | Qwen3.6 35B-A3B (reasoning) | 18 | $0.6 | 132 |
  | Gemma 4 26B-A4B (reasoning) | 17 | $0.1 | 95 |
  | Qwen3.6 35B-A3B (non-reasoning) | 15 | $0.6 | 146 |
  | Gemma 4 31B (reasoning) | 15 | not given | 35 |

  The page shows prices without a unit and gives no publication date. — [Artificial Analysis small open models](https://artificialanalysis.ai/models/open-source/small)
- Artificial Analysis index versions are not comparable. gpt-oss-20b scored 48 at its Aug 2025 launch analysis but shows 15 on the current model page. — [AA gpt-oss launch analysis](https://artificialanalysis.ai/articles/analysis-openai-gpt-oss-models), [AA gpt-oss-20b](https://artificialanalysis.ai/models/gpt-oss-20b)

### Inferences

**Size-class shortlist for README + tree + manifests → summary/labels/JSON**

| Class | Model | Notes |
|---|---|---|
| Small, CPU or laptop | Qwen3.5-4B | Apache-2.0, 262K context, IFEval 89.8 |
| | Gemma 4 E4B | Apache-2.0, 128K context, official QAT q4_0 GGUF |
| | Granite 4.2 3B | Apache-2.0 |
| | Qwen3.5-2B, Gemma 4 E2B | For very weak hardware |
| Medium, one consumer GPU | Qwen3.5-9B | |
| | Gemma 4 12B | Official q4_0 GGUF |
| | Granite 4.2 8B | |
| | gpt-oss-20b | MXFP4; reasoning model, so its output tokens include reasoning |
| | Gemma 4 26B-A4B | Only 3.8B active, so fast when it fits in memory |
| Large, hosted | Qwen3.8-27B, gpt-oss-120b, Gemma 4 31B, DeepSeek V4.1-Flash, GLM-5.3-Flash | Via Groq, Cerebras, Cloudflare, OpenRouter, Together or Vertex |

The 3,000-token input fits every context window listed, so context length does not separate the candidates.

**Turn reasoning off for this task.** Qwen3.5/3.6/3.8 and Gemma 4 think by default or on request, and gpt-oss always reasons. For a 300-token JSON summary, thinking multiplies output tokens and latency. Every provider adapter therefore needs a per-model "disable or minimise thinking" setting:
- `enable_thinking: false` for Qwen.
- No `<|think|>` token for Gemma.
- `reasoning_effort: low` for gpt-oss.

**Licence ranking for a public product.** Apache-2.0 (Qwen3.5/3.6/3.8-27B, Gemma 4, gpt-oss, Granite 4.2, Mistral Small 4, Ministral 3) and MIT (DeepSeek V4.x, GLM-5.x-Flash) are the low-friction choices. Llama 4, Kimi, Nemotron and the Qwen3.8 large models use custom ("other") licences and need a separate read before use.

### Gaps
- Exact Hub dates are creation dates of the repos, which can differ from announcement dates by a day or two.
- I did not find context length for Granite 4.2 or Nemotron Dory 4B, or quantised file sizes (GB) for any model. The model cards I read did not state Q4 memory footprints; the Hub only lists parameter counts.
- I found no published benchmark of "repository README summarisation" or "label/topic assignment" for any of these models. The comparable evidence is general instruction-following scores (IFEval/IFBench), coding scores (LiveCodeBench) and the Artificial Analysis index.
- I did not verify which models guarantee JSON-schema output natively. Constrained decoding is a property of the serving runtime (vLLM, Ollama, provider), not the weights; see the next two sections.
- I did not confirm 2026 releases for Devstral, Magistral or a Qwen3-Coder successor.

## What free or credit-funded inference options exist, and what are their real limits?

### Takeaway
Since 2025 the free landscape has shrunk.
- GitHub Models was retired on 30 Jul 2026.
- Hugging Face free accounts no longer get monthly inference credits.
- Cerebras has only a $5, 30-day trial.
- Gemini API free-tier numbers are no longer published (only shown in AI Studio).

The workable free or near-free options for 20K repositories are:
1. **Gemini API Batch (paid, 50% off)**: Gemini 2.5 Flash-Lite works out to about $4 for the whole job. The $300 GCP credit cannot pay for Gemini API in AI Studio, but it does not exclude Vertex AI.
2. **Groq free plan**: gpt-oss-20b, gpt-oss-120b and Qwen3.8-27B, but capped at 200K tokens/day per model.
3. **Cloudflare Workers AI**: 10,000 neurons/day free.
4. **OpenRouter `:free` models**: 1,000 requests/day after a one-off $10 credit purchase.
5. **Local Ollama, llama.cpp or vLLM** on the owner's PC or the future server.

### Cited Findings

**Gemini API (Google AI Studio)**
- Pricing page (last updated 2026-10-22):
  - A free tier for input and output exists on Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, 3 Flash Preview, 2.5 Flash, 2.5 Flash-Lite and Gemma 4.
  - Paid per 1M tokens (input / output), with Batch at 50% off:

    | Model | Standard | Batch |
    |---|---|---|
    | 2.5 Flash-Lite | $0.10 / $0.40 | $0.05 / $0.20 |
    | 3.1 Flash-Lite | $0.25 / $1.50 | $0.125 / $0.75 |
    | 3.5 Flash-Lite | $0.30 / $2.50 | $0.15 / $1.25 |
    | 3.8 Flash (to 31 Dec 2026) | $0.75 / $3.75 | — |
    | 3.8 Flash (from 1 Jan 2027) | $1.50 / $7.50 | — |

  - Free-tier usage is listed as used to improve Google's products.
  - [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Rate limits page (last updated 2026-10-15):
  - No free-tier numbers are given; the page says to "View your active rate limits in AI Studio".
  - Limits apply per project, not per key, and requests per day reset at midnight Pacific.
  - Batch API: 100 concurrent batch requests, 2 GB input file and 20 GB file storage. Tier 1 enqueued-token limits are 3,000,000 for Flash models and 10,000,000 for Flash-Lite. No free-tier batch figure is given.
  - [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- Third-party free-tier figures disagree. One aggregator gives 30 RPM / 1,500 RPD for 3.1 Flash-Lite. Another says free limits were cut 50–80% in Dec 2025 and lists 2.5 Flash-Lite at 15 RPM / 1,000 RPD. OpenRouter's own comparison gives Google AI Studio "5–15 RPM, 20–1,500/day". All of these are unverified. — [freellm.net](https://freellm.net/models/google-gemini/gemini-3-1-flash-lite), [pricepertoken](https://pricepertoken.com/endpoints/google-ai-studio/free), [OpenRouter free API comparison](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/)
- OpenAI-compatible endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/`.
  - Structured outputs are supported through the parse/`response_format` helpers.
  - Batch works through the OpenAI library, but file upload and download need the native client.
  - `reasoning_effort` maps to thinking levels. `"none"` disables thinking only on 2.5 models; reasoning "cannot be turned off for Gemini 2.5 Pro or 3 models".
  - The compatibility layer is still beta.
  - [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)

**Google Cloud $300 credit, Vertex AI and Cloud Run**
- Google Cloud Free Trial (page updated 2026-10-22):
  - The $300 credit is valid for 90 days.
  - It cannot pay for "Gemini API in AI Studio" or for generative AI partner models offered as a managed API.
  - A non-billable trial account cannot add GPUs to VMs, use Marketplace or request quota increases.
  - After upgrading to paid billing, the remaining credit stays usable on covered products within the original 90 days.
  - Cloud Run free tier: 2M requests, 360,000 GB-seconds and 180,000 vCPU-seconds per month. GPUs are not mentioned.
  - [Google Cloud free features](https://docs.cloud.google.com/free/docs/free-cloud-features)
- gpt-oss and Qwen3 became generally available on Vertex AI as "Open Model APIs". The launch prices were gpt-oss-120b $0.15/$0.60 and gpt-oss-20b $0.075/$0.30 per 1M tokens; gpt-oss-120b reached Vertex on 13 Aug 2025. Third-party trackers in Sep–Oct 2026 list Vertex gpt-oss-120b at $0.09/$0.36. — [Google Developer forum GA post](https://discuss.google.dev/t/now-ga-openais-gpt-oss-qwen3-models-on-vertex-ai-as-open-model-apis/253945), [DEV article, 23 Oct 2026](https://dev.to/alanwest/gpt-6-on-google-cloud-vertex-ai-your-300-free-credit-cant-pay-for-it-1363)
- It is unclear whether the $300 trial credit covers Vertex "open model" MaaS such as `gpt-oss-120b-maas`. The DEV author "couldn't get a straight answer" and advises checking billing after a few calls. — [DEV article](https://dev.to/alanwest/gpt-6-on-google-cloud-vertex-ai-your-300-free-credit-cant-pay-for-it-1363)
- Cloud Run GPUs:
  - An L4 needs at least 4 CPU and 16 GiB memory. An RTX PRO 6000 (Preview) needs at least 20 CPU and 80 GiB.
  - Cold start is about 5 s.
  - Jobs must use non-zonal-redundancy GPUs.
  - First-time RTX PRO 6000 projects get a 3-GPU quota.
  - [Cloud Run GPU services](https://docs.cloud.google.com/run/docs/configuring/services/gpu), [Cloud Run GPU jobs](https://docs.cloud.google.com/run/docs/configuring/jobs/gpu), [Cloud Run worker pool GPU](https://docs.cloud.google.com/run/docs/configuring/workerpools/gpu)
- Cloud Run L4 prices are third-party, because the official page would not render: about $0.0001867 per GPU-second with zonal redundancy off (~$0.67/h) and about $0.0002909/s with it on (~$1.05/h). CPU and memory are billed on top. — [cloudgpuprices.com](https://cloudgpuprices.com/vendors/google-cloud), [cloudchipr](https://cloudchipr.com/blog/cloud-run-pricing)

**Groq**
- Free plan, per model: openai/gpt-oss-120b, openai/gpt-oss-20b and qwen/qwen3.8-27b each allow 30 RPM, 1K RPD, 8K TPM and 200K TPD. The page says Batch and Flex processing require the Developer plan. — [Groq rate limits](https://console.groq.com/docs/rate-limits)
- Models page:

  | Model | Context | Max output | Price per 1M (in / out) | Speed (tok/s) |
  |---|---|---|---|---|
  | gpt-oss-20b | 131,072 | 65,536 | $0.075 / $0.30 | 1,000 |
  | gpt-oss-120b | 131,072 | 65,536 | $0.15 / $0.60 | 500 |
  | qwen/qwen3.8-27b (Preview, "evaluation only") | 131,072 | 16,384 | $0.80 / $4.00 | 450 |

  [Groq models](https://console.groq.com/docs/models)
- Third-party sources say the Groq Batch API is 50% off, with a 24-hour to 7-day window, and covers gpt-oss. — [morphllm Groq pricing (Oct 2026), via search snippet](https://www.morphllm.com/groq-pricing)
- Limits are per organisation, so extra API keys do not add capacity. — [fast.io Groq rate limits](https://fast.io/resources/groq-rate-limit/)

**Cerebras**
- There is no permanent free tier. The Free Trial is $5 of credit that expires after 30 days and requires a verified payment method. Trial limits for gpt-oss-120b and qwen-3.8-27b are 5 RPM, 30K uncached TPM, 1M tokens/hour and 1M tokens/day. The Developer tier allows gpt-oss-120b 1K RPM and qwen-3.8-27b 300 RPM. — [Cerebras rate limits](https://inference-docs.cerebras.ai/support/rate-limits)
- Older 2026 comparison sites still describe a "1M tokens/day free tier"; this conflicts with the official page. — [OpenRouter free API comparison](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/)

**OpenRouter**
- `:free` variants allow 20 RPM. The daily limit is 50 requests if fewer than 10 credits have ever been purchased, and 1,000 requests at 10 or more. Paid variants have no platform request cap, but upstream 429s can occur, and a negative balance can block even free models. — [OpenRouter limits](https://openrouter.ai/docs/api-reference/limits)
- OpenRouter's own comparison (data "as of April 2026", updated 24 Sep 2026) lists 20+ free models, up to 1M context, an OpenAI-compatible API, no credit card and no data training. — [OpenRouter free API comparison](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/)

**Cloudflare Workers AI** (page updated 20 Oct 2026)
- 10,000 neurons per day free, resetting at 00:00 UTC; $0.011 per 1,000 neurons beyond that on Workers Paid.
- Prices per 1M tokens (input / output):

  | Model | Price |
  |---|---|
  | qwen3.8-27b | $0.45 / $3.20 |
  | qwen3-30b-a3b-fp8 | $0.051 / $0.335 |
  | gemma-4-26b-a4b-it | $0.10 / $0.30 |
  | gpt-oss-20b | $0.20 / $0.30 |
  | gpt-oss-120b | $0.35 / $0.75 |
  | granite-4.0-h-micro | $0.017 / $0.112 |
  | mistral-small-3.1-24b | $0.351 / $0.555 |
  | llama-4-scout | $0.27 / $0.85 |
  | nemotron-3-120b-a12b | $0.50 / $1.50 |

- Kimi, GLM and DeepSeek need Workers Paid or prepaid credit.
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

**GitHub Models (retired)**
- GitHub Models was "fully retired" on 30 Jul 2026. The playground, catalog, inference API and BYOK are unavailable. It closed to new customers on 16 Jun 2026, and GitHub points to Microsoft (Azure AI) Foundry instead. — [GitHub changelog 2026-07-30](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/), [GitHub docs](https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models)

**Hugging Face Inference Providers**
- Free users get no monthly credits and must buy credits. PRO gets $2/month, and Team/Enterprise gets $2 per seat. There is no markup over provider prices. The OpenAI-compatible router is `https://router.huggingface.co/v1`. hf-inference itself now focuses on CPU and small models. — [HF Inference Providers pricing](https://huggingface.co/docs/inference-providers/pricing)

**NVIDIA API catalog (build.nvidia.com)**
- Forum and third-party reports say the 1,000-credit model ended. It was replaced by a per-account rate limit of about 40 RPM by default; moderators say "there is no official way" to get an increase on that tier, and production use requires paid NIM deployment. The endpoint is OpenAI-compatible at `integrate.api.nvidia.com/v1`. None of this is official documentation. — [CodexBar issue #2498](https://github.com/steipete/CodexBar/issues/2498), [NVIDIA forum thread](https://forums.developer.nvidia.com/t/api-rate-limit-increase-is-not-granted-by-requesting-it-here/368420)

**Mistral La Plateforme free ("Experiment") tier**
- The tier is widely reported as about 1B tokens/month. Third-party RPM figures disagree (1 RPS vs ~2 RPM), and one source says opting into data training is required. No official numbers are published outside the console. — [benchlm Mistral free tier](https://benchlm.ai/md/free-tier/mistral.md), [cheahjs free-llm-api-resources](https://mintlify.com/cheahjs/free-llm-api-resources/providers/free/mistral-plateforme)

**Local runtimes**
- Ollama:
  - The OpenAI-compatible base URL is `http://localhost:11434/v1/`. The API key is required by clients but ignored locally.
  - Supported endpoints: `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/models` and stateless `/v1/responses`.
  - Chat completions support `response_format`, `reasoning_effort`, `tools` (but not `tool_choice`), `stream`, `seed` and `temperature`.
  - [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
- Ollama structured outputs: the native `format` field takes a JSON schema, and structured outputs "work through the OpenAI-compatible API via `response_format`". Ollama recommends temperature 0 and putting the schema in the prompt. Ollama's cloud does not support structured outputs. — [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- vLLM:
  - The OpenAI-compatible server supports `response_format: {type: "json_schema"}` and `extra_body.structured_outputs` (json, regex, choice, grammar, structural_tag), using the xgrammar or guidance backends.
  - The old `guided_*` fields were removed in v0.12.0.
  - Structured outputs work with reasoning models when a `--reasoning-parser` is set.
  - Offline batch inference is available through the `LLM` class with `StructuredOutputsParams`.
  - [vLLM structured outputs](https://docs.vllm.ai/en/latest/features/structured_outputs.html)
- llama.cpp CPU benchmark (third-party): a Qwen2 3B at Q4_K_M on an unnamed x86 CPU with 4 threads processed prompts at about 67 tokens/s (pp512) and generated about 23 tokens/s (tg128). — [Radxa llama.cpp benchmarks](https://forum.radxa.com/t/llama-cpp-benchmarks/27813)

### Inferences

#### Cost and throughput for 20,000 repositories (estimate)
Workload: 20,000 × 3,000 = **60M input tokens** and 20,000 × 300 = **6M output tokens**. This assumes thinking is disabled. Reasoning models add output tokens; gpt-oss at low effort could plausibly add a few hundred tokens per call, which is unmeasured.

| Option | Price per 1M (in / out) | Total for 20K repos | Free-tier throughput / time to finish |
|---|---|---|---|
| Gemini 2.5 Flash-Lite **Batch** | $0.05 / $0.20 | **$4.20** | Async; Tier 1 enqueued cap 10M tokens means about 3,000 repos per batch wave |
| Gemini 2.5 Flash-Lite standard | $0.10 / $0.40 | $8.40 | Free tier: unverified RPD (~1,000/day would take about 20 days) |
| Gemini 3.1 Flash-Lite Batch / standard | $0.125 / $0.75; $0.25 / $1.50 | $12.00 / $24.00 | Thinking cannot be fully disabled on 3.x, so cost is higher in practice |
| Gemini 3.8 Flash Batch (2026 price) | $0.375 / $1.875 | $33.75 | — |
| Groq gpt-oss-20b paid | $0.075 / $0.30 | $6.30 (about $3.15 at the reported 50% batch discount) | Free: 200K TPD / ~3.3K tokens ≈ 60 repos/day per model, so ~333 days on one model |
| Groq gpt-oss-120b paid | $0.15 / $0.60 | $12.60 | Same free cap |
| Groq Qwen3.8-27B (Preview) | $0.80 / $4.00 | $72.00 | Same free cap |
| Vertex gpt-oss-120b MaaS | $0.15 / $0.60 at launch, or $0.09 / $0.36 per third-party trackers | $12.60, or $7.56 | Possibly payable from the $300 credit (unconfirmed) |
| Cloudflare gemma-4-26b-a4b | $0.10 / $0.30 | $7.80 | Free 10K neurons/day = $0.11/day, so ~71 days (~280 repos/day) |
| Cloudflare gpt-oss-20b | $0.20 / $0.30 | $13.80 | ~125 days on free allocation |
| Cloudflare granite-4.0-h-micro | $0.017 / $0.112 | $1.69 | ~15 days on free allocation |
| Cloudflare qwen3.8-27b | $0.45 / $3.20 | $46.20 | ~420 days on free allocation |
| OpenRouter `:free` (after a one-off $10 purchase) | $0 | $0 (plus the $10 credit) | 1,000 RPD means ~20 days; 20 RPM; free model list changes |
| Cerebras trial | — | $5 credit | 1M TPD per model ≈ 300 repos/day; expires after 30 days |
| Local CPU, 3–4B Q4 (llama.cpp/Ollama) | $0 (electricity) | $0 | Per repo ~3,000/67 ≈ 45 s prompt + 300/23 ≈ 13 s output ≈ 1 min, so ~330 h ≈ 14 days continuous on one CPU; a GPU is much faster (not measured) |
| Cloud Run L4 + vLLM, small model | ~$0.67/h GPU plus CPU/RAM | Depends on throughput | To match Gemini Batch at $4.20, the whole job must finish in ~6 GPU-hours, about 0.9 repos/s sustained. This throughput is unmeasured. |

- **Cheapest predictable path:** Gemini 2.5 Flash-Lite Batch costs about $4 for the full backfill. The catch is that the $300 credit cannot pay for AI Studio Gemini. Gemini through Vertex AI is not excluded by the trial terms, so the credit plausibly covers Vertex Gemini batch; check this in billing.
- **Best "open-weight and free" path:** Cloudflare Workers AI free neurons, or Groq free tokens, running gpt-oss-20b or Gemma 4 26B-A4B as a slow daily trickle for incremental updates. Use local Ollama on the owner's PC or the future server for bulk work.
- **Rotating free tiers across providers multiplies throughput.** Groq + Cloudflare + OpenRouter + Gemini free is roughly 60 + 280 + 1,000 + (unverified) repos/day. It also multiplies prompt-compatibility testing. Mixing models also produces inconsistent summaries, so record `provider` and `model` per row and keep one model per "generation" of summaries.
- **Provider terms on derived data:** free-tier Gemini usage may be used to improve Google products. That matters little for public README text, but should be stated in the ADR.

### Gaps
- Official per-model free-tier RPM/RPD for the Gemini API: Google now shows them only in AI Studio.
- The official Cloud Run GPU price and the Vertex AI MaaS price list: both pages are rendered client-side and could not be fetched. The figures above are third-party.
- Whether Cloud Run GPUs are allowed on a non-billable Free Trial account (the trial blocks "GPUs to VM instances"), and whether the $300 credit covers Vertex Gemini and open-model MaaS.
- Groq's official batch discount: groq.com/pricing now shows marketing copy, so the 50% figure is third-party.
- Cloudflare Workers AI and Groq support for `response_format: json_schema` per model was not verified.
- Local GPU throughput (Ollama or vLLM on a consumer GPU) for the specific candidates was not found.

## How can the model, provider and host be switched by configuration through one OpenAI-compatible interface callable from plain Go HTTP?

### Takeaway
Use the OpenAI Chat Completions wire format as the contract. Every candidate except Gemini's native batch file handling speaks it:
- Gemini (`/v1beta/openai/`)
- Groq
- Cerebras
- OpenRouter
- HF router (`router.huggingface.co/v1`)
- Cloudflare
- NVIDIA (`integrate.api.nvidia.com/v1`)
- Ollama (`localhost:11434/v1`)
- vLLM
- Vercel AI Gateway
- LiteLLM

A Go client written against `net/http` + `encoding/json` needs only: base URL, model ID, API-key env-var name, extra headers, a `response_format` JSON schema, per-provider "thinking off" parameters, and rate-limit-aware retries. No third-party Go module is needed. A gateway (LiteLLM self-hosted, OpenRouter or Vercel AI Gateway) is optional: it moves fallbacks and keys out of Go, at the cost of another hop or service.

### Cited Findings
- **LiteLLM proxy:** a self-hosted "OpenAI-compatible endpoint for 100+ LLM providers", MIT-licensed, deployed with Docker, Helm or Terraform plus Postgres. It offers virtual keys with budgets and rate limits, and load balancing, fallbacks and retries. — [LiteLLM proxy docs](https://docs.litellm.ai/docs/simple_proxy)
- **LiteLLM config:** `model_list[].model_name` is the alias clients send. `litellm_params.model`, `api_base` and `api_key: os.environ/VAR` set the deployment, and per-deployment `rpm`/`tpm` can be added. `litellm_settings.num_retries`, `request_timeout`, `allowed_fails` and `fallbacks: [{"alias": ["other-alias"]}]` control failure handling. `router_settings.routing_strategy: simple-shuffle` load-balances deployments that share the same `model_name`. — [LiteLLM config docs](https://docs.litellm.ai/docs/proxy/configs)
- **Vercel AI Gateway** (docs updated 2026-09-08): "no markup and no platform fee on tokens". The free tier gives a $5 monthly credit, renewed every 30 days after the first request. It covers a subset of models with lower per-model rate limits and returns 429 when exceeded. Buying credits moves the team to the paid tier and ends the monthly free credit. BYOK has no fee but needs purchased credits. Vercel's own pages disagree on whether the free tier covers all models. — [Vercel AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing), [search summary of Vercel docs](https://vercel.com/docs/ai-gateway/usage-and-pricing)
- **OpenRouter:** one OpenAI-compatible API with 20+ free models. Paid models have no platform cap, and fallback routing can retry other providers on upstream 429s, with `error.metadata.provider_code` showing the upstream code. — [OpenRouter limits](https://openrouter.ai/docs/api-reference/limits), [OpenRouter free API comparison](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/)
- **HF router:** `https://router.huggingface.co/v1` with an HF token routes to many providers, or uses the owner's own provider key. `X-HF-Bill-To` sets org billing. — [HF Inference Providers pricing](https://huggingface.co/docs/inference-providers/pricing)
- **Thinking controls differ by provider:**
  - Gemini: `reasoning_effort` (`"none"` only on 2.5). — [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
  - Qwen on vLLM or SGLang: `chat_template_kwargs.enable_thinking`. — [Qwen3.5-4B card](https://huggingface.co/Qwen/Qwen3.5-4B)
  - Ollama: `reasoning_effort` with model-specific values. — [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
  - Gemma 4: a `<|think|>` system-prompt token. — [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- **Structured-output support differs by provider:**
  - Gemini: OpenAI-compatible structured outputs. — [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
  - vLLM: `response_format` json_schema, or `extra_body.structured_outputs`. — [vLLM docs](https://docs.vllm.ai/en/latest/features/structured_outputs.html)
  - Ollama: `response_format` or native `format`; not on Ollama cloud. — [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- **Rate-limit behaviour to design for:**
  - Gemini: per-project limits with midnight-Pacific RPD reset. — [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
  - Groq: per-organisation limits on RPM, RPD, TPM and TPD. — [Groq rate limits](https://console.groq.com/docs/rate-limits)
  - Cerebras: hourly and daily token caps on the trial tier. — [Cerebras rate limits](https://inference-docs.cerebras.ai/support/rate-limits)
  - OpenRouter: 429 from upstream providers, and 402 on low or negative balance. — [OpenRouter limits](https://openrouter.ai/docs/api-reference/limits)

### Inferences
- **Provider record for config.** Each provider becomes a record in a `providers.json` (or environment variables), selected by `LLM_PROFILE=summarise.v1`. Fields:
  - `name`, `base_url`, `api_key_env`, `model`
  - `extra_headers`: e.g. `X-HF-Bill-To`, or OpenRouter attribution headers
  - `json_mode`: `json_schema` | `json_object` | `prompt_only`
  - `thinking_off`: a JSON fragment merged into the request, e.g. `{"reasoning_effort":"none"}` for Gemini 2.5, `{"chat_template_kwargs":{"enable_thinking":false}}` for Qwen on vLLM, or `{"reasoning_effort":"low"}` for gpt-oss
  - `rpm`, `tpm`, `tpd`, `rpd`: client-side token buckets
  - `max_concurrency`, `timeout`, `price_in`, `price_out`: for cost logging
  - `batch`: `none` | `gemini` | `openai_files`
- **Base URLs from prior knowledge, not re-fetched this session:** Groq `https://api.groq.com/openai/v1`, Cerebras `https://api.cerebras.ai/v1`, OpenRouter `https://openrouter.ai/api/v1`, Cloudflare `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1`, Vercel AI Gateway `https://ai-gateway.vercel.sh/v1`. Verify them before writing fixtures.
- **Go client behaviour, all achievable with the standard library:**
  - One `POST {base}/chat/completions`.
  - Retry 429/500/502/503/504 with exponential backoff and jitter, honouring `Retry-After`.
  - Do **not** retry 400/401/402/404. Treat 402 or quota-exhausted as "switch provider or park the job".
  - Validate the returned JSON against the schema locally, because some providers or models ignore `response_format`. Retry once with a repair prompt, then mark the job failed.
  - Persist `provider`, `model`, `prompt_version`, `schema_version`, `input_tokens`, `output_tokens` and `cost_estimate` per repository.
  - The pg_cron/job-table design fits naturally: a 429 sets `run_after` instead of sleeping.
- **Where the gateway sits.** Doing provider switching in Go keeps the stack simple: no extra service, and it matches the "standard library only" rule. LiteLLM adds a Python service plus Postgres, which is too heavy for a free tier, but it fits the later physical server. OpenRouter or Vercel AI Gateway are hosted alternatives with one key and one bill. Their free allowances ($5/month on Vercel; 50 or 1,000 free requests/day on OpenRouter) are small, and both still sit in the request path.
- **Gemini batch is the one non-portable piece.** It needs native file upload and download, so model it as a separate "batch adapter" behind the same interface: submit, poll, collect. The synchronous adapter is used everywhere else.
- **CI/CD:** keep provider records in config and keys in secrets. Contract-test the adapter against recorded fixtures plus a local Ollama or llama.cpp container serving a tiny model (e.g. Qwen3.5-0.8B or Gemma 4 E2B) in CI. Do not call paid providers in CI.

### Gaps
- I did not verify the official `json_schema` support matrix for Groq, Cerebras, Cloudflare or the NVIDIA catalog.
- I did not verify Vercel AI Gateway's free-tier model list or its exact per-model free rate limits.
- I did not check OpenRouter's structured-output parameter documentation (`response_format` / `require_parameters` provider routing).

## Which small model gives the best quality per cost for repository summaries and labels, and how is that usually measured?

### Takeaway
No published benchmark measures "README + tree → summary/labels" directly. On general evidence, the best quality-per-cost points are:
- **Small local:** Qwen3.5-4B (IFEval 89.8, Apache-2.0, 262K context) and Gemma 4 E4B (MMLU-Pro 69.4, official QAT q4_0 GGUF).
- **Medium:** Gemma 4 26B-A4B (Artificial Analysis 17 at about $0.1, 95 tok/s; $0.10/$0.30 on Cloudflare) and gpt-oss-20b ($0.075/$0.30 on Groq at 1,000 tok/s).
- **Cheapest hosted overall:** Gemini 2.5 Flash-Lite Batch, which is not open-weight.

The owner should decide on a 100–200-repository gold set scored for JSON validity, label agreement and faithfulness, with an LLM judge plus human spot checks. That is the usual method, and it is cheap at this scale.

### Cited Findings
- Qwen3.5-4B: IFEval 89.8, MMLU-Pro 79.1, LiveCodeBench v6 55.8. — [Qwen3.5-4B card](https://huggingface.co/Qwen/Qwen3.5-4B)
- Gemma 4 E4B and 12B: MMLU-Pro 69.4 and 77.2; LiveCodeBench v6 52.0 and 72.0. — [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- Qwen3.8-27B in non-reasoning mode scores Intelligence Index 20 at a price of $0.5 and 50 tok/s. Gemma 4 26B-A4B (reasoning) scores 17 at $0.1 and 95 tok/s. Qwen3.6-35B-A3B (non-reasoning) scores 15 at $0.6 and 146 tok/s. — [Artificial Analysis small open models](https://artificialanalysis.ai/models/open-source/small)
- Groq gpt-oss-20b: $0.075/$0.30 per 1M tokens at 1,000 tok/s. — [Groq models](https://console.groq.com/docs/models)
- Cloudflare gemma-4-26b-a4b-it: $0.10/$0.30 per 1M tokens. — [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- In summarisation-evaluation research, G-Eval-style LLM judges agreed best with human faithfulness ratings, ahead of NLI- and QA-based metrics. FactScore-style atomic-fact checking performed poorly. — [UniSumEval (arXiv 2409.19898)](https://arxiv.org/pdf/2409.19898)
- LLM-only faithfulness judging is not enough. FaithJudge adds human-annotated hallucination examples to the judge prompt. — [arXiv 2505.04847](https://arxiv.org/pdf/2505.04847v1)
- Judges can be swayed by shortcuts. Excluding a model from judging its own outputs limits self-preference. — [arXiv 2509.26072](https://arxiv.org/html/2509.26072v2), [arXiv 2606.08000](https://arxiv.org/pdf/2606.08000)
- Practice guidance: use temperature 0, give explicit scale anchors in the judge prompt, and keep human evaluation for release decisions. — [benchmarkingagents.com LLM-as-judge](https://benchmarkingagents.com/llm-as-judge)

### Inferences
- **Suggested evaluation for SEFGH.** Assemble 150 repositories stratified by language, size and README quality, including empty or non-English READMEs. Score each candidate on:
  1. **JSON validity rate** without repair.
  2. **Label quality**: precision and recall against the repository's own GitHub topics as weak gold, plus a fixed SEFGH taxonomy if one is adopted.
  3. **Faithfulness**: an LLM judge from a *different* family, temperature 0, with a 1–5 anchored rubric that asks "does every claim appear in README, tree or manifests?".
  4. **Usefulness for search**: offline retrieval tests, i.e. whether the summary embedding retrieves the repository for held-out queries. This ties to the Embed stage.
  5. **Cost and latency per repository.**

  Pick the cheapest model within a small margin of the best on items 2 and 3.
- **Prior expectation, not measured:** a 4B model with constrained JSON decoding is likely adequate for "what is this repo / top 5 labels" when the input is a clean README. Larger models matter most for sparse READMEs, where the file tree and manifests must be interpreted. Gemma 4 26B-A4B and gpt-oss-20b are the cheapest hosted "medium" options to test against Qwen3.5-4B and Gemma 4 E4B run locally.
- **Freeze the generation.** Summaries feed embeddings, so changing the summarising model later shifts the semantic space. Treat "summariser model + prompt version" like the embedding model: one pinned generation, with re-summarisation as an explicit backfill.

### Gaps
- No public benchmark of these specific models on GitHub-repository summarisation or topic labelling was found. The quality ranking above rests on general benchmarks and must be validated with the owner's gold set.
- IFEval/IFBench scores were not available for Gemma 4, gpt-oss-20b or Granite 4.2 on the pages fetched, so a like-for-like instruction-following comparison is incomplete.
- Artificial Analysis did not show its tiny-model (<4B) section or several candidates (Qwen3.5-4B/9B, Gemma 4 E4B/12B, gpt-oss-20b, Granite 4.2) on the small-model page fetched this session.
