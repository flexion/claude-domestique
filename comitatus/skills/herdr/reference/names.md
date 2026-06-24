# herd naming

the **only** name you assign is the **member handle** - a call-sign from the pool below, set
with `agent rename`. everything else is left at herdr's default:

- a **worktree's workspace** is auto-labeled by herdr with the **worktree directory name**
  (`chore-comitatus-fixes`); a **repo's main checkout** with the **repo name**
  (`claude-domestique`). you never rename either - see the `## naming` section of
  [SKILL.md](../SKILL.md).
- the decorated **tab** label `<handle> <glyph>` (`fox ◆`) is the one other thing you set, via
  `tab rename`; it is not pooled either.

so this file is just the member call-sign pool.

## members - individual agents

short, phonetically distinct call-signs, type-agnostic, each claimed as the **next unused**
entry - check live state and skip any already in use:

```bash
: "${H:?set H from the herdr orientation line before piping herdr JSON into node}"
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
