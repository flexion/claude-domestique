# Tool Description Quality Rubric — Shared Reference

## The Six-Component Rubric

Every tool description is scored from 1 to 5 on six components. Score 3 is the minimum viable threshold; any component scoring below 3 constitutes a smell.

| Score | Purpose | Usage Guidelines | Limitations | Parameter Explanation | Examples vs Description | Length and Completeness |
|---|---|---|---|---|---|---|
| **5** | Clearly explains function, behavior, and return data with precise language. | Explicitly states appropriate use cases and when not to use; includes disambiguation if the tool name is ambiguous. | Clearly states what the tool does not return, scope boundaries, and important constraints. | Every parameter is explained with type, meaning, behavioral effect, and required or default status. | Description is self-sufficient; examples, if any, supplement rather than replace the explanation. | Four or more sentences of substantive, well-structured prose covering all aspects. |
| **4** | Explains function and behavior with minor ambiguity. | States when to use with minimal guidance on when not to use. | Mentions main limitations but misses some edge cases. | Most parameters are explained with minor omissions. | Mostly descriptive with minor reliance on examples. | Three to four sentences with good coverage. |
| **3** | Basic explanation present but lacks behavioral details. | Implies usage context but lacks explicit boundaries. | Vague or incomplete limitation statements. | Basic parameter information is present but lacks behavioral impact. | Even mix of description and examples. | Two to three sentences that are somewhat complete. |
| **2** | Vague or incomplete purpose statement. | Usage context unclear or overly generic. | Minimal or implied limitations only. | Parameters are listed without meaningful explanation. | Over-relies on examples with minimal prose. | One to two sentences that are too brief. |
| **1** | Purpose unclear or missing. | No usage guidance provided. | No limitations or caveats mentioned. | Parameters are not explained or only provided in schema form. | Only examples are provided with no descriptive explanation. | Single phrase or fragment. |

## Labeling Rules

- **Good:** All six components score ≥ 3.
- **Bad:** Any component scores < 3, OR examples replace the description instead of supporting it.

## Component Notes

**Purpose** is the single most important component — 44% of tools are smell-free on Purpose alone, but only 2.9% are smell-free across all components.

**Limitations** is the only component where poor quality is empirically worse than absence. Removing vague Limitations improved SR by 10pp in one domain. Vague or self-referential limitations ("this may require further investigation") introduce uncertainty into the FM's reasoning.

**Parameter Explanation** has the highest inter-rater reliability (ICC 0.90) — the most objectively assessable component and the best candidate for deterministic testing.

**Examples** are statistically dispensable (Cochran's Q test, p > 0.20 across all configurations). Removing them does not significantly degrade performance.

**Length and Completeness** is a meta-quality dimension — automatically fulfilled when other components are populated. Descriptions scoring 1–2 on Length guarantee multiple missing components.

## Structural Detection Markers

Keyword patterns for detecting rubric components without an LLM:

**Usage Guidelines phrases:** `use this when`, `use this to`, `do not use`, `instead use`, `not suitable for`

**Limitations phrases:** `does not`, `cannot`, `only`, `limited to`, `will not return`, `will not`

**Examples phrases:** `example`, `e.g.`, `for instance`, `such as`

**Vague limitation anti-patterns (flag these):**
- `may require ... investigation`
- `requires disambiguation`
- `further analysis`
- `subject to ... limitations`
- `this contradiction`

## The Dual Nature of Tool Descriptions

A tool description embodies a dual nature: (i) a requirement-like specification defining expected behavior and parameter constraints, and (ii) a prompt-like instruction shaping the FM's contextual reasoning and decision-making.
