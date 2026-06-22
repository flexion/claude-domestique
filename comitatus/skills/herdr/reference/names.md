# herd naming

the **member** tier draws its call-signs from a pool (below). the **herder** and **herd**
tiers are *not* pooled - they are labeled descriptively (a short **repo tag** and a short
**task tag**); see the `## naming` section of [SKILL.md](../SKILL.md). this file holds the
member pool plus the rules for picking the descriptive tags.

## task / repo tags (herd + herder labels)

not a pool - a short, readable abbreviation of the branch (herd) or repo (herder), chosen
by judgment, not an algorithm:

```
chore/comitatus-fixes        -> comitatus
chore/refactor-terraform     -> terraform
issue/feature-3/add-socius   -> socius
repo claude-domestique       -> claude-dom
```

rules:

- **<= ~10 chars.** agent rows render `<workspace> · <tab>`, so a longer label truncates the
  member's decorated tab label. abbreviate to fit.
- **unique among live herds.** on a genuine collision, qualify one (`tf-refac` / `api-refac`);
  repo groups already separate them visually.
- **descriptive, not stable.** the label follows the work - relabel when you reassign a herd
  to a new branch.

check live labels before reusing one:

```bash
herdr workspace list | python3 -c 'import sys,json;print(sorted(w.get("label") for w in json.load(sys.stdin)["result"]["workspaces"]))'   # taken workspace labels
```

## members - individual agents

short, phonetically distinct call-signs, type-agnostic, each claimed as the **next unused**
entry - check live state and skip any already in use:

```bash
herdr agent list | node "$H" members  # taken member handles
```

constraints:

- **member handles are globally unique - herdr enforces it.** a duplicate `agent start` is
  rejected with `agent_name_taken` (verified). the pool must comfortably exceed your peak
  concurrent agent count.
- **type-agnostic handles.** never encode the model in a handle; the tab already shows the glyph.
- **phonetic distinctness.** members address each other by handle in the from/to protocol, and
  weak local models mis-type look-alikes - avoid rhyming clusters.

```
tim   jay   sly   gus   mae   ned   kit   pip   rex   ada
hal   val   wes   zed   sol   ren   lou   dot   cleo  otis
bea   fitz  hank  jules nico  quinn tess  vlad  wren  zane
```

for maximum distinctness over flavor, use the NATO phonetic set instead (each word is
deliberately unconfusable over a noisy channel):

```
alfa bravo charlie delta echo foxtrot golf hotel india juliet
kilo lima mike november oscar papa quebec romeo sierra tango
uniform victor whiskey xray yankee zulu
```
