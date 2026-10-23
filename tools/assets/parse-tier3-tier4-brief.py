"""Turn the supplied Tier 3/4 brief into a reviewable, lossless design index."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


HEAD = re.compile(r"(?m)(\d+)\. (h[0-9A-Z]{3}) — ")
ELEMENTS = {"Kim": 1, "Mộc": 2, "Thủy": 3, "Hỏa": 4, "Thổ": 5}
STAT_LABELS = {
    "hp": r"HP:\s*([\d,]+)",
    "attack": r"Công:\s*([\d,]+)",
    "armor": r"Giáp:\s*([\d,]+)",
    "range": r"Tầm đánh:\s*([\d.]+)",
    "interval": r"Tốc đánh:\s*([\d.]+)s",
    "speed": r"Tốc chạy:\s*([\d.]+)",
    "block": r"Chặn quái \(Block\):\s*(\d+)",
}


def between(source: str, start: str, end: str | None) -> str:
    if start not in source:
        raise ValueError(f"Missing brief field: {start}")
    tail = source.split(start, 1)[1]
    return tail.split(end, 1)[0].strip() if end else tail.strip()


def parse(source: str) -> dict:
    heads = list(HEAD.finditer(source))
    if len(heads) != 24:
        raise ValueError(f"Expected 24 heroes, found {len(heads)}")
    heroes = []
    for index, match in enumerate(heads):
        body = source[match.end():heads[index + 1].start() if index + 1 < len(heads) else len(source)]
        name = body.split("Công thức ghép:", 1)[0].strip()
        stats_text = between(body, "Chỉ số cơ bản:", "Đánh thường")
        stats = {}
        for key, pattern in STAT_LABELS.items():
            found = re.search(pattern, stats_text)
            if key != "block" and not found:
                raise ValueError(f"{match.group(2)} missing {key}")
            if found:
                value = found.group(1).replace(",", "")
                stats[key] = int(value) if key in {"hp", "attack", "armor", "block"} else float(value)
        identity = between(body, "Hệ & Vai trò:", "Chỉ số cơ bản:")
        element_name = re.search(r"Hệ (Kim|Mộc|Thủy|Hỏa|Thổ)", identity)
        energy = between(body, "Cơ chế năng lượng:", "Kỹ năng chủ động —")
        energy_type = re.search(r"rage_on_hit|rage_on_attack|cooldown", energy)
        if not element_name or not energy_type:
            raise ValueError(f"{match.group(2)} missing element or energy type")
        skill = between(body, "Kỹ năng chủ động — ", "Thông số:")
        heroes.append({
            "id": match.group(2), "tier": 3 if index < 11 else 4, "name": name,
            "recipe": between(body, "Công thức ghép:", "Hệ & Vai trò:"),
            "element": ELEMENTS[element_name.group(1)], "roleDescription": identity,
            "stats": stats,
            "basicAttack": between(body, "Đánh thường", "Cơ chế năng lượng:"),
            "energyType": energy_type.group(0), "energyDescription": energy,
            "skillName": skill.split(" (", 1)[0], "skillDescription": skill,
            "skillParameters": between(body, "Thông số:", "Hiệu ứng:"),
            "skillEffect": between(body, "Hiệu ứng:", "Mô tả Tạo hình (Art Direction):"),
            "artDirection": between(body, "Mô tả Tạo hình (Art Direction):", "Kịch bản VFX (Babylon.js):"),
            "vfxDirection": between(body, "Kịch bản VFX (Babylon.js):", None),
        })
    if len({hero["id"] for hero in heroes}) != 24:
        raise ValueError("Duplicate hero ID")
    return {"source": "plans/261015-1935-tier3-tier4-heroes/brief.txt", "heroes": heroes}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = parse(args.input.read_text(encoding="utf-8"))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Indexed {len(result['heroes'])} heroes in {args.output}")
