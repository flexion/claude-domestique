# herd naming

the **member** tier draws its call-signs from a pool (below). the **herder** and **herd**
tiers are *not* pooled - they are labeled descriptively (a herder by a short **repo tag**, a
herd by its **worktree name**); see the `## naming` section of [SKILL.md](../SKILL.md). this
file holds the member pool plus the rules for the descriptive labels.

## worktree names + repo tags (herd + herder labels)

not a pool:

- a **herd** is labeled with its **worktree directory name** verbatim - the basename of
  `~/.herdr/worktrees/<repo>/<branch-slug>`. (a herd not on a worktree gets a short
  descriptive tag instead.)
- a **herder** is labeled with a short **repo tag** - a ~10-char abbreviation of the repo.

```
chore/comitatus-fixes      (worktree) -> chore-comitatus-fixes
chore/refactor-terraform   (worktree) -> chore-refactor-terraform
repo claude-domestique     (herder)   -> claude-dom
```

rules:

- **a worktree name is long and truncates the tab label.** agent rows render
  `<workspace> · <tab>`, so a full worktree name pushes the member's decorated
  `<handle> <glyph>` tab label off the collapsed sidebar - the handle reappears on
  focus/widen. that is the accepted trade for an unambiguous label; keep the **herder** repo
  tag short (~10) so its own row stays readable.
- **unique among live workspaces.** two worktrees rarely share a basename; if they do, the
  paths differ - qualify the label.
- **descriptive, not stable.** the label follows the worktree - relabel when you reassign a
  herd to a new worktree.

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
