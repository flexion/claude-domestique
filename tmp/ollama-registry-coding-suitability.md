# Ollama registry — coding suitability

Source: https://ollama.com/library scraped 2026-09-15. 240 models.

`Runs locally` is judged against a 36 GB M3 Pro (~25 GB usable GPU memory, Q4 ~= 0.6 GB per B param).


## A. Code-specialised (30)

Trained or finetuned specifically for code. Suitable — this is their purpose.

| Model | Sizes | Runs locally | Updated | Note |
|---|---|---|---|---|
| `codebooga` | 34b | fits: 34b | 2 years ago | A high-performing code instruct model created by merging two existing code models. |
| `codegeex4` | 9b | fits: 9b | 2 years ago | A versatile model for AI software development scenarios, including code completion. |
| `codegemma` | 2b, 7b | fits: 2b, 7b | 2 years ago | CodeGemma is a collection of powerful, lightweight models that can perform a variety of coding tasks like fill |
| `codellama` | 7b, 13b, 34b, 70b | fits: 7b, 13b, 34b | 2 years ago | A large language model that can use text prompts to generate and discuss code. |
| `codeqwen` | 7b | fits: 7b | 2 years ago | CodeQwen1.5 is a large language model pretrained on a large amount of code data. |
| `codestral` | 22b | fits: 22b | 2 years ago | Codestral is Mistral AI’s first-ever code model designed for code generation tasks. |
| `codeup` | 13b | fits: 13b | 2 years ago | Great code generation model based on Llama2. |
| `deepcoder` | 1.5b, 14b | fits: 1.5b, 14b | 1 year ago | DeepCoder is a fully open-Source 14B coder model at O3-mini level, with a 1.5B version also available. |
| `deepseek-coder` | 1.3b, 6.7b, 33b | fits: 1.3b, 6.7b, 33b | 2 years ago | DeepSeek Coder is a capable coding model trained on two trillion code and natural language tokens. |
| `deepseek-coder-v2` | 16b, 236b | fits: 16b | 2 years ago | An open-source Mixture-of-Experts code language model that achieves performance comparable to GPT4-Turbo in co |
| `devstral` | 24b | fits: 24b | 1 year ago | Devstral: the best open source model for coding agents |
| `devstral-2` | 123b | too large | 9 months ago | 123B model that excels at using |
| `devstral-small-2` | 24b | fits: 24b | 9 months ago | 24B model that excels at using |
| `dolphincoder` | 7b, 15b | fits: 7b, 15b | 2 years ago | A 7B and 15B uncensored variant of the Dolphin model family that excels at coding, based on StarCoder2. |
| `duckdb-nsql` | 7b | fits: 7b | 2 years ago | 7B parameter text-to-SQL model made by MotherDuck and Numbers Station. |
| `granite-code` | 3b, 8b, 20b, 34b | fits: 3b, 8b, 20b, 34b | 2 years ago | A family of open foundation models by IBM for Code Intelligence |
| `kimi-k2.7-code` | cloud | cloud-only | 3 months ago | Kimi K2.7 Code is Moonshot AI&#39;s coding-focused agentic model built upon Kimi K2.6, with substantial improv |
| `magicoder` | 7b | fits: 7b | 2 years ago | 🎩 Magicoder is a family of 7B parameter models trained on 75K synthetic instruction data using OSS-Instruct, a |
| `north-mini-code-1.0` | — | size n/a | 2 months ago | North Mini Code is Cohere&#39;s first model for developers — a 30B Mixture-of-Experts model with 3B active par |
| `opencoder` | 1.5b, 8b | fits: 1.5b, 8b | 1 year ago | OpenCoder is an open and reproducible code LLM family which includes 1.5B and 8B models, supporting chat in En |
| `phind-codellama` | 34b | fits: 34b | 2 years ago | Code generation model based on Code Llama. |
| `qwen2.5-coder` | 0.5b, 1.5b, 3b, 7b, 14b, 32b | fits: 0.5b, 1.5b, 3b, 7b, 14b, 32b | 1 year ago | The latest series of Code-Specific Qwen models, with significant improvements in code generation, code reasoni |
| `qwen3-coder` | 30b, 480b | fits: 30b | 11 months ago | Alibaba&#39;s performant long context models for agentic and coding tasks. |
| `qwen3-coder-next` | — | size n/a | 7 months ago | Qwen3-Coder-Next is a coding-focused language model from Alibaba&#39;s Qwen team, optimized for agentic coding |
| `sqlcoder` | 7b, 15b | fits: 7b, 15b | 2 years ago | SQLCoder is a code completion model fined-tuned on StarCoder for SQL generation tasks |
| `stable-code` | 3b | fits: 3b | 2 years ago | Stable Code 3B is a coding model with instruct and code completion variants on par with models such as Code Ll |
| `starcoder` | 1b, 3b, 7b, 15b | fits: 1b, 3b, 7b, 15b | 2 years ago | StarCoder is a code generation model trained on 80&#43; programming languages. |
| `starcoder2` | 3b, 7b, 15b | fits: 3b, 7b, 15b | 2 years ago | StarCoder2 is the next generation of transparently trained open code LLMs that comes in three sizes: 3B, 7B an |
| `wizardcoder` | 33b | fits: 33b | 2 years ago | State-of-the-art code generation model |
| `yi-coder` | 1.5b, 9b | fits: 1.5b, 9b | 2 years ago | Yi-Coder is a series of open-source code language models that delivers state-of-the-art coding performance wit |

## B. Current general models (115)

Code is a real but secondary capability. Suitable for code to a degree that tracks size and recency; I have not benchmarked these individually.

| Model | Sizes | Runs locally | Updated | Note |
|---|---|---|---|---|
| `athene-v2` | 72b | too large | 1 year ago | Athene-V2 is a 72B parameter model which excels at code completion, mathematics, and log extraction tasks. |
| `aya` | 8b, 35b | fits: 8b, 35b | 2 years ago | Aya 23, released by Cohere, is a new family of state-of-the-art, multilingual models that support 23 languages |
| `aya-expanse` | 8b, 32b | fits: 8b, 32b | 1 year ago | Cohere For AI&#39;s language models trained to perform well across 23 different languages. |
| `cogito` | 3b, 8b, 14b, 32b, 70b | fits: 3b, 8b, 14b, 32b | 1 year ago | Cogito v1 Preview is a family of hybrid reasoning models by Deep Cogito that outperform the best available ope |
| `cogito-2.1` | 671b | too large | 9 months ago | The Cogito v2.1 LLMs are instruction tuned generative models. All models are released under MIT license for co |
| `command-a` | 111b | too large | 1 year ago | 111 billion parameter model optimized for demanding enterprises that require fast, secure, and high-quality AI |
| `command-r` | 35b | fits: 35b | 2 years ago | Command R is a Large Language Model optimized for conversational interaction and long context tasks. |
| `command-r-plus` | 104b | too large | 2 years ago | Command R&#43; is a powerful, scalable large language model purpose-built to excel at real-world enterprise us |
| `command-r7b` | 7b | fits: 7b | 1 year ago | The smallest model in Cohere&#39;s R series delivers top-tier speed, efficiency, and quality to build powerful |
| `command-r7b-arabic` | 7b | fits: 7b | 1 year ago | A new state-of-the-art version of the lightweight Command R7B model that excels in advanced Arabic language ca |
| `dbrx` | 132b | too large | 2 years ago | DBRX is an open, general-purpose LLM created by Databricks. |
| `deepscaler` | 1.5b | fits: 1.5b | 1 year ago | A fine-tuned version of Deepseek-R1-Distilled-Qwen-1.5B that surpasses the performance of OpenAI’s o1-preview  |
| `deepseek-llm` | 7b, 67b | fits: 7b | 2 years ago | An advanced language model crafted with 2 trillion bilingual tokens. |
| `deepseek-r1` | 1.5b, 7b, 8b, 14b, 32b, 70b, 671b | fits: 1.5b, 7b, 8b, 14b, 32b |  | DeepSeek-R1 is a family of open reasoning models with performance approaching that of leading models, such as  |
| `deepseek-v2` | 16b, 236b | fits: 16b | 2 years ago | A strong, economical, and efficient Mixture-of-Experts language model. |
| `deepseek-v2.5` | 236b | too large | 2 years ago | An upgraded version of DeekSeek-V2 that integrates the general and coding abilities of both DeepSeek-V2-Chat a |
| `deepseek-v3` | 671b | too large | 1 year ago | A strong Mixture-of-Experts (MoE) language model with 671B total parameters with 37B activated for each token. |
| `deepseek-v3.1` | 671b | too large | 11 months ago | DeepSeek-V3.1-Terminus is a hybrid model that supports both |
| `deepseek-v4-flash` | cloud | cloud-only | 1 month ago | DeepSeek-V4-Flash is the official release of DeepSeek-V4-Flash, built for efficient reasoning across a 1M-toke |
| `deepseek-v4-pro` | cloud | cloud-only | 1 month ago | DeepSeek-V4-Pro is a frontier Mixture-of-Experts model with a large context window and three reasoning modes. |
| `deepseek-v4.1-flash` | cloud | cloud-only | 5 days ago | DeepSeek-V4.1-Flash is an advanced tool designed to enhance search capabilities, providing users with faster a |
| `dolphin-mixtral` | 8x7b, 8x22b | too large | 1 year ago | Uncensored, 8x7b and 8x22b fine-tuned models based on the Mixtral mixture of experts models that excels at cod |
| `dolphin3` | 8b | fits: 8b | 1 year ago | Dolphin 3.0 Llama 3.1 8B 🐬 is the next generation of the Dolphin series of instruct-tuned models designed to b |
| `exaone-deep` | 2.4b, 7.8b, 32b | fits: 2.4b, 7.8b, 32b | 1 year ago | EXAONE Deep exhibits superior capabilities in various reasoning tasks including math and coding benchmarks, ra |
| `exaone3.5` | 2.4b, 7.8b, 32b | fits: 2.4b, 7.8b, 32b | 1 year ago | EXAONE 3.5 is a collection of instruction-tuned bilingual (English and Korean) generative models ranging from  |
| `falcon` | 7b, 40b, 180b | fits: 7b, 40b | 2 years ago | A large language model built by the Technology Innovation Institute (TII) for use in summarization, text gener |
| `falcon3` | 1b, 3b, 7b, 10b | fits: 1b, 3b, 7b, 10b | 1 year ago | A family of efficient AI models under 10B parameters performant in science, math, and coding through innovativ |
| `gemma2` | 2b, 9b, 27b | fits: 2b, 9b, 27b | 2 years ago | Google Gemma 2 is a high-performing and efficient model available in three sizes: 2B, 9B, and 27B. |
| `gemma3` | 1b, 4b, 12b, 27b | fits: 1b, 4b, 12b, 27b | 1 year ago | The current, most capable model that runs on a single GPU. |
| `gemma3n` | — | size n/a | 1 year ago | Gemma 3n models are designed for efficient execution on everyday devices such as laptops, tablets or phones. e |
| `gemma4` | 12b, 26b, 31b | cloud-only |  | Gemma 4 models are designed to deliver frontier-level performance at each size. They are well-suited for reaso |
| `glm-4.7-flash` | — | size n/a | 3 months ago | As the strongest model in the 30B class, GLM-4.7-Flash offers a new option for lightweight deployment that bal |
| `glm-5.1` | cloud | cloud-only | 5 months ago | GLM-5.1 is our next-generation flagship model for agentic engineering, with significantly stronger coding capa |
| `glm-5.2` | cloud | cloud-only | 3 months ago | GLM-5.2 is Z.ai’s flagship model for the era of long-horizon tasks. |
| `glm-5.3` | cloud | cloud-only | 2 weeks ago | Z.ai&#39;s flagship model and the most capable open-weights model for coding, with major gains on long-horizon |
| `glm-5.3-flash` | cloud | cloud-only | 2 weeks ago | Z.ai&#39;s first natively multimodal model, approaching Claude Opus 4.8 on coding and agentic benchmarks with  |
| `gpt-oss` | 20b, 120b | cloud-only | 11 months ago | OpenAI’s open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases. |
| `granite3-dense` | 2b, 8b | fits: 2b, 8b | 1 year ago | The IBM Granite 2B and 8B models are designed to support tool-based use cases and support for retrieval augmen |
| `granite3-moe` | 1b, 3b | fits: 1b, 3b | 1 year ago | The IBM Granite 1B and 3B models are the first mixture of experts (MoE) Granite models from IBM designed for l |
| `granite3.1-dense` | 2b, 8b | fits: 2b, 8b | 1 year ago | The IBM Granite 2B and 8B models are text-only dense LLMs trained on over 12 trillion tokens of data, demonstr |
| `granite3.1-moe` | 1b, 3b | fits: 1b, 3b | 1 year ago | The IBM Granite 1B and 3B models are long-context mixture of experts (MoE) Granite models from IBM designed fo |
| `granite3.2` | 2b, 8b | fits: 2b, 8b | 1 year ago | Granite-3.2 is a family of long-context AI models from IBM Granite fine-tuned for thinking capabilities. |
| `granite3.3` | 2b, 8b | fits: 2b, 8b | 1 year ago | IBM Granite 2B and 8B models are 128K context length language models that have been fine-tuned for improved re |
| `granite4` | 1b, 3b | fits: 1b, 3b | 10 months ago | Granite 4 features improved instruction following (IF) and tool-calling capabilities, making them more effecti |
| `granite4.1` | 3b, 8b, 30b | fits: 3b, 8b, 30b | 3 months ago | IBM Granite Models are a family of enterprise-ready, open foundation models that support multilingual capabili |
| `granite4.2` | 3b, 8b, 30b | fits: 3b, 8b, 30b | 2 weeks ago | IBM Granite Models are a family of enterprise-ready, open foundation models that support multilingual capabili |
| `hermes3` | 3b, 8b, 70b, 405b | fits: 3b, 8b | 1 year ago | Hermes 3 is the latest version of the flagship Hermes series of LLMs by Nous Research |
| `internlm2` | 1.8b, 7b, 20b | fits: 1.8b, 7b, 20b | 2 years ago | InternLM2.5 is a 7B parameter model tailored for practical scenarios with outstanding reasoning capability. 1m |
| `kimi-k2.6` | cloud | cloud-only | 4 months ago | Kimi K2.6 is an open-source, native multimodal agentic model that advances practical capabilities in long-hori |
| `kimi-k3` | cloud | cloud-only | 1 month ago | Kimi K3 is an open-weight, native multimodal agentic model and our most capable model to date. |
| `laguna-s-2.1` | — | size n/a | 2 weeks ago | Our most capable model to date, designed for long-horizon work. 70.2% on Terminal-Bench 2.1 at 118B-A8B. |
| `laguna-xs-2.1` | — | size n/a | 2 weeks ago | Laguna XS 2.1 is a 33B total parameter Mixture-of-Experts model with 3B activated parameters per token designe |
| `laguna-xs.2` | — | size n/a | 1 month ago | Laguna XS.2 is a 33B total parameter Mixture-of-Experts model with 3B activated parameters per token designed  |
| `lfm2` | 24b | fits: 24b | 6 months ago | LFM2 is a family of hybrid models designed for on-device deployment. LFM2-24B-A2B is the largest model in the  |
| `lfm2.5` | 8b | fits: 8b | 3 months ago | LFM2.5-8B-A1B, an edge model built for fast, reliable tool calling on consumer hardware. |
| `lfm2.5-thinking` | 1.2b | fits: 1.2b | 7 months ago | LFM2.5 is a new family of hybrid models designed for on-device deployment. |
| `llama-pro` | — | size n/a | 2 years ago | An expansion of Llama 2 that specializes in integrating both general language understanding and domain-specifi |
| `llama3-chatqa` | 8b, 70b | fits: 8b | 2 years ago | A model from NVIDIA based on Llama 3 that excels at conversational question answering (QA) and retrieval-augme |
| `llama3-gradient` | 8b, 70b | fits: 8b | 2 years ago | This model extends LLama-3 8B&#39;s context length from 8k to over 1m tokens. |
| `llama3-groq-tool-use` | 8b, 70b | fits: 8b | 2 years ago | A series of models from Groq that represent a significant advancement in open-source AI capabilities for tool  |
| `llama3.1` | 8b, 70b, 405b | fits: 8b | 1 year ago | Llama 3.1 is a new state-of-the-art model from Meta available in 8B, 70B and 405B parameter sizes. |
| `llama3.2` | 1b, 3b | fits: 1b, 3b | 1 year ago | Meta&#39;s Llama 3.2 goes small with 1B and 3B models. |
| `llama3.3` | 70b | too large | 1 year ago | New state of the art 70B model. Llama 3.3 70B offers similar performance compared to the Llama 3.1 405B model. |
| `llama4` | 16x17b, 128x17b | too large | 1 year ago | Meta&#39;s latest collection of multimodal models. |
| `magistral` | 24b | fits: 24b | 1 year ago | Magistral is a small, efficient reasoning model with 24B parameters. |
| `marco-o1` | 7b | fits: 7b | 1 year ago | An open large reasoning model for real-world solutions by the Alibaba International Digital Commerce Group (AI |
| `minimax-m2.7` | cloud | cloud-only | 6 months ago | MiniMax&#39;s M2-series model for coding, agentic workflows, and professional productivity. |
| `minimax-m3` | cloud | cloud-only | 3 months ago | MiniMax M3: Coding &amp; Agentic Frontier. 1M context window. Native Multimodality. |
| `ministral-3` | 3b, 8b, 14b | fits: 3b, 8b, 14b | 9 months ago | The Ministral 3 family is designed for edge deployment, capable of running on a wide range of hardware. |
| `mistral` | 7b | fits: 7b | 1 year ago | The 7B model released by Mistral AI, updated to version 0.3. |
| `mistral-large` | 123b | too large | 1 year ago | Mistral Large 2 is Mistral&#39;s new flagship model that is significantly more capable in code generation, mat |
| `mistral-large-3` | cloud | cloud-only | 9 months ago | A general-purpose multimodal mixture-of-experts model for production-grade tasks and enterprise workloads. |
| `mistral-nemo` | 12b | fits: 12b | 1 year ago | A state-of-the-art 12B model with 128k context length, built by Mistral AI in collaboration with NVIDIA. |
| `mistral-small` | 22b, 24b | fits: 22b, 24b | 1 year ago | Mistral Small 3 sets a new benchmark in the “small” Large Language Models category below 70B. |
| `mistral-small3.1` | 24b | fits: 24b | 1 year ago | Building upon Mistral Small 3, Mistral Small 3.1 (2503) adds state-of-the-art |
| `mistral-small3.2` | 24b | fits: 24b | 1 year ago | An update to Mistral Small that improves on function calling, instruction following, and less repetition error |
| `mixtral` | 8x7b, 8x22b | too large | 1 year ago | A set of Mixture of Experts (MoE) model with open weights by Mistral AI in 8x7b and 8x22b parameter sizes. |
| `muse-glimmer` | 30b | fits: 30b | 2 weeks ago | Meta&#39;s latest open model built for always-on local agents. 30B parameters, licensed under Apache 2.0 and r |
| `nemotron` | 70b | too large | 1 year ago | Llama-3.1-Nemotron-70B-Instruct is a large language model customized by NVIDIA to improve the helpfulness of L |
| `nemotron-3-nano` | 4b, 30b | cloud-only | 6 months ago | Nemotron-3-Nano is a new Standard for Efficient, Open, and Intelligent Agentic Models, now updated with a 4B p |
| `nemotron-3-super` | 120b | cloud-only | 6 months ago | NVIDIA Nemotron 3 Super is a 120B open MoE model activating just 12B parameters to deliver maximum compute eff |
| `nemotron-3-ultra` | cloud | cloud-only | 3 months ago | NVIDIA Nemotron 3 Ultra is built for high-throughput reasoning and long-running agent workflows. |
| `nemotron-3.5-lightning` | 30b | fits: 30b | 2 weeks ago | NVIDIA Nemotron 3.5 Lightning is an open 30B mixture-of-experts (MoE) model with 3B active parameters built fo |
| `nemotron-cascade-2` | 30b | fits: 30b | 5 months ago | An open 30B MoE model from NVIDIA with 3B activated parameters that delivers strong reasoning and agentic capa |
| `nemotron-mini` | 4b | fits: 4b | 1 year ago | A commercial-friendly small language model by NVIDIA optimized for roleplay, RAG QA, and function calling. |
| `nemotron3` | 33b | fits: 33b | 4 months ago | NVIDIA Nemotron 3 Nano Omni is a multimodal large language model that unifies video, audio, image, and text un |
| `nous-hermes2` | 10.7b, 34b | fits: 10.7b, 34b | 2 years ago | The powerful family of models by Nous Research that excels at scientific discussion and coding tasks. |
| `nous-hermes2-mixtral` | 8x7b | too large | 1 year ago | The Nous Hermes 2 model from Nous Research, now trained over Mixtral. 8x |
| `olmo-3` | 7b, 32b | fits: 7b, 32b | 9 months ago | Olmo is a series of Open language models designed to enable the science of language models. These models are p |
| `olmo-3.1` | 32b | fits: 32b | 9 months ago | Olmo is a series of Open language models designed to enable the science of language models. These models are p |
| `olmo2` | 7b, 13b | fits: 7b, 13b | 1 year ago | OLMo 2 is a new family of 7B and 13B models trained on up to 5T tokens. These models are on par with or better |
| `openthinker` | 7b, 32b | fits: 7b, 32b | 1 year ago | A fully open-source family of reasoning models built using a dataset derived by distilling DeepSeek-R1. |
| `ornith` | 9b, 35b | fits: 9b, 35b | 2 months ago | A self-improving family of open-source models for agentic coding |
| `ornith-1.5` | 9b, 35b, 397b | fits: 9b, 35b | 3 weeks ago | Chirp Chirp! 🐦 We are introducing Ornith-1.5, a major step toward building foundation models through end-to-en |
| `phi4` | 14b | fits: 14b | 1 year ago | Phi-4 is a 14B parameter, state-of-the-art open model from Microsoft. |
| `phi4-mini` | 3.8b | fits: 3.8b | 1 year ago | Phi-4-mini brings significant enhancements in multilingual support, reasoning, and mathematics, and now, the l |
| `phi4-mini-reasoning` | 3.8b | fits: 3.8b | 1 year ago | Phi 4 mini reasoning is a lightweight open model that balances efficiency with advanced reasoning ability. |
| `phi4-reasoning` | 14b | fits: 14b | 1 year ago | Phi 4 reasoning and reasoning plus are 14-billion parameter open-weight reasoning models that rival much large |
| `qwen2` | 0.5b, 1.5b, 7b, 72b | fits: 0.5b, 1.5b, 7b | 2 years ago | Qwen2 is a new series of large language models from Alibaba group |
| `qwen2.5` | 0.5b, 1.5b, 3b, 7b, 14b, 32b, 72b | fits: 0.5b, 1.5b, 3b, 7b, 14b, 32b |  | Qwen2.5 models are pretrained on Alibaba&#39;s latest large-scale dataset, encompassing up to 18 trillion toke |
| `qwen3` | 0.6b, 1.7b, 4b, 8b, 14b, 30b, 32b, 235b | fits: 0.6b, 1.7b, 4b, 8b, 14b, 30b, 32b |  | Qwen3 is the latest generation of large language models in Qwen series, offering a comprehensive suite of dens |
| `qwen3-next` | 80b | too large | 9 months ago | The first installment in the Qwen3-Next series with strong performance in terms of both parameter efficiency a |
| `qwen3.5` | 0.8b, 2b, 4b, 9b, 27b, 35b, 122b | cloud-only |  | Qwen 3.5 is a family of open-source multimodal models that delivers exceptional utility and performance. |
| `qwen3.6` | 27b, 35b | fits: 27b, 35b | 1 week ago | Qwen3.6 delivers substantial upgrades in agentic coding and |
| `qwen3.8` | 27b | fits: 27b | 1 month ago | Qwen3.8 delivers substantial gains across coding, professional work, research, and long-horizon agentic tasks. |
| `qwen3.8-flash-next` | — | size n/a | 1 week ago | This experimental preview of the architecture that will underpin Qwen4. |
| `qwq` | 32b | fits: 32b | 1 year ago | QwQ is the reasoning model of the Qwen series. |
| `r1-1776` | 70b, 671b | too large | 1 year ago | A version of the DeepSeek-R1 model that has been post trained to provide unbiased, accurate, and factual infor |
| `reflection` | 70b | too large | 2 years ago | A high-performing model trained with a new technique called Reflection-tuning that teaches a LLM to detect mis |
| `rnj-1` | 8b | fits: 8b | 9 months ago | Rnj-1 is a family of 8B parameter open-weight, dense models trained from scratch by Essential AI, optimized fo |
| `sailor2` | 1b, 8b, 20b | fits: 1b, 8b, 20b | 1 year ago | Sailor2 are multilingual language models made for South-East Asia. Available in 1B, 8B, and 20B parameter size |
| `smallthinker` | 3b | fits: 3b | 1 year ago | A new small reasoning model fine-tuned from the Qwen 2.5 3B Instruct model. |
| `solar-pro` | 22b | fits: 22b | 1 year ago | Solar Pro Preview: an advanced large language model (LLM) with 22 billion parameters designed to fit into a si |
| `tulu3` | 8b, 70b | fits: 8b | 1 year ago | Tülu 3 is a leading instruction following model family, offering fully open-source data, code, and recipes by  |
| `yi` | 6b, 9b, 34b | fits: 6b, 9b, 34b | 2 years ago | Yi 1.5 is a high-performing, bilingual language model. |

## C. Legacy / small / niche general models (49)

Superseded, tiny, or roleplay-tuned. Technically emit code, but outclassed by anything in A or B at the same footprint.

| Model | Sizes | Runs locally | Updated | Note |
|---|---|---|---|---|
| `alfred` | 40b | fits: 40b | 2 years ago | A robust conversational model designed to be used for both chat and instruct use cases. |
| `dolphin-llama3` | 8b, 70b | fits: 8b | 2 years ago | Dolphin 2.9 is a new model with 8B and 70B sizes by Eric Hartford based on Llama 3 that has a variety of instr |
| `dolphin-mistral` | 7b | fits: 7b | to version 2.8. 7b 1.7M Pulls 120 Tags Updated 2 years ago | The uncensored Dolphin model based on Mistral that excels at coding tasks. Updated to version 2.8. |
| `dolphin-phi` | 2.7b | fits: 2.7b | 2 years ago | 2.7B uncensored Dolphin model by Eric Hartford, based on the Phi language model by Microsoft Research. |
| `everythinglm` | 13b | fits: 13b | 2 years ago | Uncensored Llama2 based model with support for a 16K context window. |
| `falcon2` | 11b | fits: 11b | 2 years ago | Falcon2 is an 11B parameters causal decoder-only model built by TII and trained over 5T tokens. |
| `gemma` | 2b, 7b | fits: 2b, 7b | to version 1.1 2b 7b 8.3M Pulls 102 Tags Updated 2 years ago | Gemma is a family of lightweight, state-of-the-art open models built by Google DeepMind. Updated to version 1. |
| `glm4` | 9b | fits: 9b | 2 years ago | A strong multi-lingual general language model with competitive performance to Llama 3. |
| `goliath` | — | size n/a | 2 years ago | A language model created by combining two fine-tuned Llama 2 70B models into one. |
| `llama2` | 7b, 13b, 70b | fits: 7b, 13b | 2 years ago | Llama 2 is a collection of foundation language models ranging from 7B to 70B parameters. |
| `llama2-chinese` | 7b, 13b | fits: 7b, 13b | 2 years ago | Llama 2 based model fine tuned to improve Chinese dialogue ability. |
| `llama2-uncensored` | 7b, 70b | fits: 7b | 2 years ago | Uncensored Llama 2 model by George Sung and Jarrad Hope. |
| `llama3` | 8b, 70b | fits: 8b | 2 years ago | Meta Llama 3: The most capable openly available LLM to date |
| `megadolphin` | 120b | too large | 2 years ago | MegaDolphin-2.2-120b is a transformation of Dolphin-2.2-70b created by interleaving the model with itself. |
| `mistral-openorca` | 7b | fits: 7b | 2 years ago | Mistral OpenOrca is a 7 billion parameter model, fine-tuned on top of the Mistral 7B model using the OpenOrca  |
| `mistrallite` | 7b | fits: 7b | 2 years ago | MistralLite is a fine-tuned model based on Mistral with enhanced capabilities of processing long contexts. |
| `neural-chat` | 7b | fits: 7b | 2 years ago | A fine-tuned model based on Mistral with good coverage of domain and language. |
| `notus` | 7b | fits: 7b | 2 years ago | A 7B chat model fine-tuned with high-quality data and based on Zephyr. |
| `notux` | 8x7b | too large | 2 years ago | A top-performing mixture of experts model, fine-tuned with high-quality data. 8x |
| `nous-hermes` | 7b, 13b | fits: 7b, 13b | 2 years ago | General use models based on Llama and Llama 2 from Nous Research. |
| `open-orca-platypus2` | 13b | fits: 13b | 2 years ago | Merge of the Open Orca OpenChat model and the Garage-bAInd Platypus 2 model. Designed for chat and code genera |
| `openchat` | 7b | fits: 7b | to version 3.5-0106. 7b 1.3M Pulls 50 Tags Updated 2 years ago | A family of open-source models trained on a wide variety of data, surpassing ChatGPT on various benchmarks. Up |
| `openhermes` | — | size n/a | 2 years ago | OpenHermes 2.5 is a 7B model fine-tuned by Teknium on Mistral with fully open datasets. |
| `orca-mini` | 3b, 7b, 13b, 70b | fits: 3b, 7b, 13b | 2 years ago | A general-purpose model ranging from 3 billion parameters to 70 billion, suitable for entry-level hardware. |
| `orca2` | 7b, 13b | fits: 7b, 13b | 2 years ago | Orca 2 is built by Microsoft research, and are a fine-tuned version of Meta&#39;s Llama 2 models. The model is |
| `phi` | 2.7b | fits: 2.7b | 2 years ago | Phi-2: a 2.7B language model by Microsoft Research that demonstrates outstanding reasoning and language unders |
| `phi3` | 3.8b, 14b | fits: 3.8b, 14b | 2 years ago | Phi-3 is a family of lightweight 3B (Mini) and 14B (Medium) state-of-the-art open models by Microsoft. |
| `phi3.5` | 3.8b | fits: 3.8b | 2 years ago | A lightweight AI model with 3.8 billion parameters with performance overtaking similarly and larger sized mode |
| `qwen` | 0.5b, 1.8b, 4b, 7b, 14b, 32b, 72b, 110b | fits: 0.5b, 1.8b, 4b, 7b, 14b, 32b |  | Qwen 1.5 is a series of large language models by Alibaba Cloud spanning from 0.5B to 110B parameters |
| `samantha-mistral` | 7b | fits: 7b | 2 years ago | A companion assistant trained in philosophy, psychology, and personal relationships. Based on Mistral. |
| `smollm` | 1.7b | fits: 1.7b | 2 years ago | 🪐 A family of small models with 135M, 360M, and 1.7B parameters, trained on a new high-quality dataset. 135m 3 |
| `smollm2` | 1.7b | fits: 1.7b | 1 year ago | SmolLM2 is a family of compact language models available in three size: 135M, 360M, and 1.7B parameters. |
| `solar` | 10.7b | fits: 10.7b | 2 years ago | A compact, yet powerful 10.7B large language model designed for single-turn conversation. |
| `stable-beluga` | 7b, 13b, 70b | fits: 7b, 13b | 2 years ago | Llama 2 based model fine tuned on an Orca-style dataset. Originally called Free Willy. |
| `stablelm-zephyr` | 3b | fits: 3b | 2 years ago | A lightweight chat model allowing accurate, and responsive output without requiring high-end hardware. |
| `stablelm2` | 1.6b, 12b | fits: 1.6b, 12b | 2 years ago | Stable LM 2 is a state-of-the-art 1.6B and 12B parameter language model trained on multilingual data in Englis |
| `starling-lm` | 7b | fits: 7b | 2 years ago | Starling is a large language model trained by reinforcement learning from AI feedback focused on improving cha |
| `tinydolphin` | 1.1b | fits: 1.1b | 2 years ago | An experimental 1.1B parameter model trained on the new Dolphin 2.8 dataset by Eric Hartford and based on Tiny |
| `tinyllama` | 1.1b | fits: 1.1b | 2 years ago | The TinyLlama project is an open endeavor to train a compact 1.1B Llama model on 3 trillion tokens. |
| `vicuna` | 7b, 13b, 33b | fits: 7b, 13b, 33b | 2 years ago | General use chat model based on Llama and Llama 2 with 2K to 16K context sizes. |
| `wizard-vicuna` | 13b | fits: 13b | 2 years ago | Wizard Vicuna is a 13B parameter model based on Llama 2 trained by MelodysDreamj. |
| `wizard-vicuna-uncensored` | 7b, 13b, 30b | fits: 7b, 13b, 30b | 2 years ago | Wizard Vicuna Uncensored is a 7B, 13B, and 30B parameter model based on Llama 2 uncensored by Eric Hartford. |
| `wizardlm` | — | size n/a | 2 years ago | General use model based on Llama 2. |
| `wizardlm-uncensored` | 13b | fits: 13b | 2 years ago | Uncensored version of Wizard LM model |
| `wizardlm2` | 7b, 8x22b | fits: 7b | 2 years ago | State of the art large language model from Microsoft AI with improved performance on complex chat, multilingua |
| `xwinlm` | 7b, 13b | fits: 7b, 13b | 2 years ago | Conversational model based on Llama 2 that performs competitively on various benchmarks. |
| `yarn-llama2` | 7b, 13b | fits: 7b, 13b | 2 years ago | An extension of Llama 2 that supports a context of up to 128k tokens. |
| `yarn-mistral` | 7b | fits: 7b | 2 years ago | An extension of Mistral to support context windows of 64K or 128K. |
| `zephyr` | 7b, 141b | fits: 7b | 2 years ago | Zephyr is a series of fine-tuned versions of the Mistral and Mixtral models that are trained to act as helpful |

## D. Not suitable (46)

Architecturally or topically incapable of code generation.

| Model | Sizes | Runs locally | Updated | Note |
|---|---|---|---|---|
| `all-minilm` | — | size n/a | 2 years ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `bakllava` | 7b | fits: 7b | 2 years ago | Vision model — image understanding; any code ability is incidental |
| `bespoke-minicheck` | 7b | fits: 7b | 1 year ago | Narrow task model (extraction/translation/function dispatch) — not general code generation |
| `bge-large` | — | size n/a | 2 years ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `bge-m3` | — | size n/a | 2 years ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `deepseek-ocr` | 3b | fits: 3b | 9 months ago | OCR — extracts text from images, not a code generator |
| `embeddinggemma` | — | size n/a | 1 year ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `firefunction-v2` | 70b | too large | 2 years ago | Narrow task model (extraction/translation/function dispatch) — not general code generation |
| `functiongemma` | — | size n/a | 9 months ago | Narrow task model (extraction/translation/function dispatch) — not general code generation |
| `glm-ocr` | — | size n/a | 7 months ago | OCR — extracts text from images, not a code generator |
| `gpt-oss-safeguard` | 20b, 120b | fits: 20b | 10 months ago | Safety classifier — scores content against policy, does not generate code |
| `granite-embedding` | — | size n/a | 1 year ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `granite3-guardian` | 2b, 8b | fits: 2b, 8b | 1 year ago | Safety classifier — scores content against policy, does not generate code |
| `granite3.2-vision` | 2b | fits: 2b | 1 year ago | Vision model — image understanding; any code ability is incidental |
| `granite4.1-guardian` | 8b | fits: 8b | 3 months ago © 2026 Ollama Download Blog Docs <a href="https://github.com/ollama/ollama" class="hover | Safety classifier — scores content against policy, does not generate code |
| `llama-guard3` | 1b, 8b | fits: 1b, 8b | 1 year ago | Safety classifier — scores content against policy, does not generate code |
| `llama3.2-vision` | 11b, 90b | fits: 11b | 1 year ago | Vision model — image understanding; any code ability is incidental |
| `llava` | 7b, 13b, 34b | fits: 7b, 13b, 34b | to version 1.6. vision 7b 13b 34b 14.9M Pulls 98 Tags Updated 2 years ago | Vision model — image understanding; any code ability is incidental |
| `llava-llama3` | 8b | fits: 8b | 2 years ago | Vision model — image understanding; any code ability is incidental |
| `llava-phi3` | 3.8b | fits: 3.8b | 2 years ago | Vision model — image understanding; any code ability is incidental |
| `mathstral` | 7b | fits: 7b | 2 years ago | Math specialist — symbolic reasoning, not code generation |
| `medgemma` | 4b, 27b | fits: 4b, 27b | 5 months ago | Medical-domain tuned — no code training |
| `medgemma1.5` | 4b | fits: 4b | 5 months ago | Medical-domain tuned — no code training |
| `meditron` | 7b, 70b | fits: 7b | 2 years ago | Medical-domain tuned — no code training |
| `medllama2` | 7b | fits: 7b | 2 years ago | Medical-domain tuned — no code training |
| `minicpm-v` | 8b | fits: 8b | 1 year ago | Vision model — image understanding; any code ability is incidental |
| `minicpm-v4.5` | 8b | fits: 8b | 3 months ago | Vision model — image understanding; any code ability is incidental |
| `minicpm-v4.6` | 1b | fits: 1b | 3 months ago | Vision model — image understanding; any code ability is incidental |
| `mistral-medium-3.5` | 128b | too large | 4 months ago | Medical-domain tuned — no code training |
| `moondream` | 1.8b | fits: 1.8b | 2 years ago | Vision model — image understanding; any code ability is incidental |
| `mxbai-embed-large` | — | size n/a | 2 years ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `nexusraven` | 13b | fits: 13b | 2 years ago | Narrow task model (extraction/translation/function dispatch) — not general code generation |
| `nomic-embed-text` | — | size n/a | 2 years ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `nomic-embed-text-v2-moe` | — | size n/a | 9 months ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `nuextract` | 3.8b | fits: 3.8b | 2 years ago | Narrow task model (extraction/translation/function dispatch) — not general code generation |
| `paraphrase-multilingual` | — | size n/a | 2 years ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `qwen2-math` | 1.5b, 7b, 72b | fits: 1.5b, 7b | 2 years ago | Math specialist — symbolic reasoning, not code generation |
| `qwen2.5vl` | 3b, 7b, 32b, 72b | fits: 3b, 7b, 32b | 1 year ago | Vision model — image understanding; any code ability is incidental |
| `qwen3-embedding` | 0.6b, 4b, 8b | fits: 0.6b, 4b, 8b | 11 months ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `qwen3-vl` | 2b, 4b, 8b, 30b, 32b, 235b | fits: 2b, 4b, 8b, 30b, 32b |  | Vision model — image understanding; any code ability is incidental |
| `reader-lm` | 0.5b, 1.5b | fits: 0.5b, 1.5b | 2 years ago | Narrow task model (extraction/translation/function dispatch) — not general code generation |
| `shieldgemma` | 2b, 9b, 27b | fits: 2b, 9b, 27b | 1 year ago | Safety classifier — scores content against policy, does not generate code |
| `snowflake-arctic-embed` | — | size n/a | 2 years ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `snowflake-arctic-embed2` | — | size n/a | 1 year ago | Embedding model — emits vectors, cannot generate code (useful only for indexing a codebase for retrieval) |
| `translategemma` | 4b, 12b, 27b | fits: 4b, 12b, 27b | 8 months ago | Narrow task model (extraction/translation/function dispatch) — not general code generation |
| `wizard-math` | 7b, 13b, 70b | fits: 7b, 13b | 2 years ago | Math specialist — symbolic reasoning, not code generation |
