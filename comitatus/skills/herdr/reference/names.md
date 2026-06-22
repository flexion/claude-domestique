# herd naming pools

names for the **shepherd -> herd -> members** taxonomy (see the `## naming` section of [SKILL.md](../SKILL.md)). each name is a herdr **workspace label** (herder, herd) or a **member handle**, claimed as the *next unused* entry from its pool - check live state and skip any already in use:

```bash
herdr workspace list | python3 -c 'import sys,json;print(sorted(w.get("label") for w in json.load(sys.stdin)["result"]["workspaces"]))'   # taken herder/herd labels  # (label list; helper covers handles)
herdr agent list     | node "$H" members  # taken member handles
```

constraints:

- **labels <= ~10 chars.** agent rows render `<workspace> · <tab>`, so a longer herder/herd label truncates the member's decorated tab label.
- **member handles are globally unique - herdr enforces it.** a duplicate `agent start` is rejected with `agent_name_taken` (verified). the member pool must comfortably exceed your peak concurrent agent count, or the shepherd runs out of names.
- **type-agnostic handles.** never encode the model in a handle; the tab already shows the glyph.

## herders - top-level orchestrators

role names for the single top-level orchestrator per herdr session (a second repo = a second session = a second herder). `herder` itself is omitted (it collides with the product name *herdr*).

```
shepherd  drover    wrangler  mahout    falconer  rancher   grazier
stockman  herdsman  cowhand   cowboy    gaucho    vaquero   buckaroo
goatherd  swineherd cameleer  muleteer  teamster  wagoner   ostler
apiarist  beekeeper houndsman warden    keeper    handler   nomad
```

## herds - managed groups

collective nouns (deduped from the curated list). all <= 10 chars.

```
colony, troop, flutter, caravan, clowder, army, quiver, murder, pack, drove,
soar, parade, mob, business, school, stand, skulk, leash, gaggle, flock, tower,
cloud, horde, charm, cast, kettle, bloat, thunder, team, cackle, conspiracy,
mischief, passel, romp, raft, parliament, prickle, gaze, den, pit, unkindness,
stench, bed, scurry, fever, bevy, ambush, streak, dazzle, zeal
```

- **too long (>10 chars - will truncate the tab label; use only if you accept that):** `congregation`, `kaleidoscope`, `convocation`, `flamboyance`, `ostentation`
- **negative connotation (keep or drop consciously if a label ever faces anyone but you):** `murder`, `unkindness`, `conspiracy`, `stench`, `cackle`, `mischief`

## members - individual agents

short, phonetically distinct call-signs. type-agnostic. avoid rhyming clusters - members address each other by handle in the from/to protocol, and weak local models mis-type look-alikes.

```
tim   jay   sly   gus   mae   ned   kit   pip   rex   ada
hal   val   wes   zed   sol   ren   lou   dot   cleo  otis
bea   fitz  hank  jules nico  quinn tess  vlad  wren  zane
```

for maximum distinctness over flavor, use the NATO phonetic set instead (each word is deliberately unconfusable over a noisy channel):

```
alfa bravo charlie delta echo foxtrot golf hotel india juliet
kilo lima mike november oscar papa quebec romeo sierra tango
uniform victor whiskey xray yankee zulu
```
