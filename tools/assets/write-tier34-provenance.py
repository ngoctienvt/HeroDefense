"""Keep the user brief and generation route beside every Tier 3/4 source set."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BRIEF = json.loads((ROOT / "content/tier3-tier4-brief.json").read_text(encoding="utf-8"))
SOURCES = ROOT / "assets/sprites/tier3-tier4"

for hero in BRIEF["heroes"]:
    source = SOURCES / hero["id"] / "source"
    source.mkdir(parents=True, exist_ok=True)
    (source / "master-prompt-reconstructed.txt").write_text(
        "RECONSTRUCTED FROM THE USER BRIEF; NOT A VERBATIM RECORD OF THE IMAGEGEN REQUEST.\n"
        f"Create a unique stylized hand-painted top-down hero master for {hero['id']} ({hero['name']}). "
        "Match the approved Pangu master as a style reference only: heroic upper body, readable silhouette, "
        "clear cel shading and rim light, oversized signature weapon. Preserve the distinct costume and face. "
        "Use an elevated 40-degree orthographic camera and a solid magenta key background.\n"
        f"Character direction: {hero['artDirection']}\n",
        encoding="utf-8",
    )
    (source / "turnaround-prompt-reconstructed.txt").write_text(
        "RECONSTRUCTED FROM THE USER BRIEF; NOT A VERBATIM RECORD OF THE IMAGEGEN REQUEST.\n"
        f"Use the approved {hero['id']} south master as the identity reference. "
        "Draw true south, west, north and east views in a 2x2 sheet with the same costume, anatomy, "
        "weapon, palette, camera elevation and light direction; leave complete figures and clear gutters. "
        "North shows the back and west/east are true opposing profiles. Solid magenta background.\n",
        encoding="utf-8",
    )
    provenance = {
        "heroId": hero["id"],
        "brief": "content/tier3-tier4-brief.json",
        "styleReference": "assets/sprites/pangu-topdown/source/south-master.png",
        "generationRoute": "OpenAI imagegen, 2026-10-15/16; magenta-key source",
        "exactMasterPromptRetained": False,
        "exactTurnaroundPromptRetained": False,
        "motionPromptFiles": [name for name in ("walk-prompt.txt", "attack-prompt.txt", "attack-revision2-prompt.txt") if (source / name).is_file()],
        "runtimePackaged": (SOURCES / hero["id"] / "web/atlas.webp").is_file(),
        "edits": (
            "h00J turnaround/walk were corrected after visual review."
            if hero["id"] == "h00J" else
            "h00Z attack-revision1.png had two adjacent figures touch; attack.png is the revised sheet with full gutters."
            if hero["id"] == "h00Z" else
            "See source images, contact sheets, and qa.json when packaged."
        ),
    }
    (source / "provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(f"Saved source provenance for {len(BRIEF['heroes'])} Tier 3/4 heroes")
