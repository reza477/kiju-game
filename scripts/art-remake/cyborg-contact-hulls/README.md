# Cyborg terminal hull authoring

`generate.py` reads the original `assets/carriers/meshy/cyborg.glb` and writes
`src/cyborg-contact-hulls.js`. It requires NumPy and SciPy. Use `--packages PATH`
for an existing isolated package directory, or use the normal Python environment.
The local default is `artifacts/art-remake/mesh-experiments/python`. `--output PATH`
can write a separate candidate without touching runtime source.

```powershell
python scripts/art-remake/cyborg-contact-hulls/generate.py
node --test tests/cyborg-contact-hulls.test.mjs
```

The generated module contains four convex terminal hulls, 312 original vertex
IDs and positions, and 608 outward-facing triangles. Triangle indices address
the original 67,489-vertex source, not the small per-region arrays. Read weights
and UVs from those original IDs during integration. Keep the original source
geometry as the unrendered contact pool so the existing sole and strike solvers
still operate on their original data.

The left palm contact is vertex 57876; the right is 56711. Both remain direct
visible hull vertices with unchanged positions and skin weights. The generator
fails on a different source SHA instead of silently applying old indices.

Initial CPU evidence is retained in
`artifacts/art-remake/cyborg-contact-hulls/validation.json`: 121 Casual_Walk
samples at the game's nonuniform body scale. Maximum right boot sole difference
is 0.002493 metres; left boot and terminal hand forward differences are zero.
The broad axis bounds differ by up to 0.05571 metres for boots and 0.29084 metres
for hand cuffs. The latter includes source cuff vertices previously omitted by
whole-triangle filtering. No additional sampled linear-slope penetration was
measured. This measures the original walk clip, not the later IK or strike poses.
Convex filling changes concave shapes; mixed-joint skinning still needs the
game's ordinary animation and visual review. Experimental source scripts and
the complete region/contact ID pools remain beside that report.
