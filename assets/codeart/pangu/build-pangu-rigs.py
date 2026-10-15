"""Author the small, editable Pangu SVG rigs and motion tracks for codeart2d."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STYLE = """<style>
.outline{stroke:#202330;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}
.stone{fill:#9c9182}.stone-dark{fill:#655e61}.crack{fill:none;stroke:#f5d574;stroke-width:1.3}
.gold{fill:#d5a34a}.gold-hi{fill:#f6d576}.gold-dark{fill:#80572f}
.hair{fill:#d8dadd}.hair-hi{fill:#f5f2e9}.hair-dark{fill:#90939f}
.skin{fill:#ae947e}.skin-shade{fill:#786960}.dark{fill:#292b3c}.night{fill:#3b435b}
.red{fill:#a63e38}.red-dark{fill:#6a2730}.teal{fill:#438f82}.eye{fill:#ffe184}
</style>"""


def bone(name: str, x: int, y: int, content: str, z: int | None = None) -> str:
    order = f' data-z="{z}"' if z is not None else ""
    return f'<g id="{name}" data-pivot="{x} {y}"{order}>{content}</g>'


def halo(view: str) -> str:
    rx = 30 if view == "left" else 34
    ring = f'<ellipse class="stone-dark outline" cx="64" cy="46" rx="{rx}" ry="35"/>'
    hole = f'<ellipse fill="#ffffff" cx="64" cy="46" rx="{rx-8}" ry="27"/>'
    # Opaque rim and ornament; the empty middle is cut out with a path, not white paint.
    outer = f'<ellipse fill="none" stroke="#202330" stroke-width="11" cx="64" cy="46" rx="{rx}" ry="35"/>'
    middle = f'<ellipse fill="none" stroke="#8f8170" stroke-width="7" cx="64" cy="46" rx="{rx}" ry="35"/>'
    accents = '<circle class="gold outline" cx="64" cy="11" r="5"/><circle class="teal outline" cx="34" cy="46" r="4"/><circle class="teal outline" cx="94" cy="46" r="4"/>'
    return bone("halo", 64, 46, outer + middle + accents, 0)


def rocks() -> str:
    items = [
        '<path class="stone-dark outline" d="M8 105l8-9 8 5 1 12-11 6-8-5z"/>',
        '<path class="stone outline" d="M105 106l8-10 10 4 2 12-9 5-11-5z"/>',
        '<path class="stone outline" d="M19 83l5-7 8 3 1 8-8 5z"/>',
        '<path class="stone-dark outline" d="M109 78l6-7 8 3 1 9-9 4z"/>',
        '<path class="crack" d="M10 107l8 3 2-8M109 108l7-5 5 6"/>',
    ]
    return bone("rocks", 64, 116, "".join(items), 1)


def leg(name: str, x: int, shade: bool, z: int) -> str:
    armor = "stone-dark" if shade else "stone"
    boot = "gold-dark" if shade else "gold"
    thigh = f'<path class="{armor} outline" d="M{x-8} 77h16l-2 20-12 1z"/><path class="gold outline" d="M{x-9} 77h18l-2 6h-14z"/>'
    shin = f'<path class="dark outline" d="M{x-6} 96h12l2 19h-16z"/><path class="{boot} outline" d="M{x-8} 97h16l-2 8h-12z"/>'
    foot = f'<path class="{boot} outline" d="M{x-7} 113h14l6 5v2h-25v-3z"/>'
    return bone(f"thigh_{name}", x, 79, thigh + bone(f"shin_{name}", x, 97, shin + bone(f"foot_{name}", x, 116, foot, z + 1)), z)


def torso(view: str) -> str:
    if view == "left":
        body = '<path class="skin-shade outline" d="M49 47q13-8 27 0l8 27-13 9-23-6z"/><path class="skin outline" d="M48 51q13-6 24-2l4 23-10 6-19-6z"/>'
        face = '<path class="skin outline" d="M55 25q-12 3-15 13l8 4 1 7 18-1 5-14-8-10z"/><path class="hair outline" d="M50 27q11-11 23 0l4 14-10 18-7-1-11-18z"/><path class="hair-hi outline" d="M45 41l12 8 10 12-13 3-16-17z"/><circle class="eye" cx="48" cy="37" r="2"/>'
    elif view == "back":
        body = '<path class="skin-shade outline" d="M48 46q16-7 32 0l8 31-24 8-24-8z"/><path class="skin outline" d="M51 49q14-6 26 0l5 22-18 7-18-7z"/>'
        face = '<path class="hair-dark outline" d="M52 22q12-9 24 0l9 25-3 24-13 13-16-11-13-22z"/><path class="hair outline" d="M54 22q14-7 21 3l6 29-15 26-19-26z"/><path class="hair-hi" d="M60 27q-6 21-2 39l6 9 6-12-3-30z"/>'
    else:
        body = '<path class="skin-shade outline" d="M45 48q19-9 38 0l6 25-25 11-25-11z"/><path class="skin outline" d="M47 51q17-6 34 0l2 20-19 8-19-8z"/><path class="crack" d="M50 54l7 10-4 8m20-18-5 11 7 8"/>'
        face = '<ellipse class="skin outline" cx="64" cy="36" rx="12" ry="14"/><path class="hair outline" d="M51 33q-2-19 13-20 15 1 13 20l-6-6-7-4-7 5z"/><path class="hair-hi outline" d="M55 42q9 6 18 0l6 21-15 8-15-8z"/><path class="hair-dark" d="M60 45q4 8 8 0l-4 18z"/><circle class="eye" cx="59" cy="35" r="1.7"/><circle class="eye" cx="69" cy="35" r="1.7"/>'
    chest = '<path class="gold outline" d="M46 48l-9 3 3 10 9-3m30-10 9 3-3 10-9-3z"/><path class="gold-hi" d="M60 76h8l3 4-7 4-7-4z"/>'
    loin = '<path class="red-dark outline" d="M44 76h40l3 24-16 9-7-13-8 13-16-9z"/><path class="red outline" d="M55 82h18l5 24-14 11-14-11z"/><path class="gold outline" d="M47 76h34l-2 7H49z"/><circle class="teal outline" cx="64" cy="80" r="4"/>'
    head = bone("head", 64, 45, face + '<circle class="gold-hi outline" cx="64" cy="18" r="4"/>', 50)
    return bone("torso", 64, 78, body + chest + loin + head + arms(), 30)


def arms() -> str:
    left = '<path class="skin-shade outline" d="M43 49q-9 0-11 11l3 17 9 2 6-18z"/><path class="gold outline" d="M31 70l14 1-2 11-13-2z"/><circle class="skin outline" cx="38" cy="83" r="5"/>'
    right = '<path class="skin outline" d="M85 49q9 0 11 11l-3 17-9 2-6-18z"/><path class="gold outline" d="M83 70l14 1-1 11-13-2z"/><circle class="skin outline" cx="90" cy="83" r="5"/>'
    return bone("arm_left", 42, 53, left, 55) + bone("arm_right", 86, 53, right, 55)


def weapon(view: str) -> str:
    if view == "front":
        shaft = '<path class="dark outline" d="M36 83l67-10 1 5-67 10z"/>'
        blade = '<path class="gold outline" d="M100 60l20-10-6 15 8 10-8 13-23-7z"/><path class="night outline" d="M97 75l25 0-8 25-17-13z"/><circle class="gold-hi outline" cx="105" cy="77" r="5"/>'
    else:
        shaft = '<path class="dark outline" d="M26 74l67 11-1 5-67-11z"/>'
        blade = '<path class="gold outline" d="M29 59L9 50l6 16-8 8 8 14 23-7z"/><path class="night outline" d="M32 75L7 75l8 24 17-13z"/><circle class="gold-hi outline" cx="23" cy="76" r="5"/>'
    shift = -8 if view == "front" else 8
    return bone("weapon", 64, 79, f'<g transform="translate({shift} 0)">{shaft}{blade}</g>', 70)


def make_rig(view: str) -> str:
    facing = "left" if view == "left" else "right"
    contents = halo(view) + rocks() + bone("hips", 64, 79, leg("far", 55, True, 10) + leg("near", 73, False, 45), 20) + torso(view) + weapon(view)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" data-codeart="rig.v1" data-anchor="64 121" data-facing="{facing}" data-outline="#202330">{STYLE}{bone("root", 64, 121, contents)}</svg>\n'


def make_anim(view: str) -> dict:
    swing = -1 if view == "front" else 1
    wave = lambda amounts: [[i / (len(amounts) - 1), value] for i, value in enumerate(amounts)]
    idle = {
        "frames": 4, "loop": True, "duration_ms": 200,
        "tracks": {
            "torso": {"translate": wave([[0, 0], [0, -1], [0, 0], [0, 1], [0, 0]])},
            "halo": {"rotate": wave([0, 1, 0, -1, 0])},
            "weapon": {"rotate": wave([0, 1, 0, -1, 0])},
        },
    }
    walk = {
        "frames": 8, "loop": True, "duration_ms": 100, "stride_world_units": 12,
        "events": [{"t": 0, "name": "step_l"}, {"t": 0.5, "name": "step_r"}],
        "tracks": {
            "hips": {"translate": wave([[0, 1], [0, 0], [0, 1], [0, 2], [0, 1], [0, 0], [0, 1], [0, 2], [0, 1]])},
            "arm_left": {"rotate": wave([0, 4, 8, 4, 0, -4, -8, -4, 0])},
            "arm_right": {"rotate": wave([0, -4, -8, -4, 0, 4, 8, 4, 0])},
            "weapon": {"rotate": wave([0, 2, 0, -2, 0, 2, 0, -2, 0])},
        },
        "ik": {
            "far": {"bones": ["thigh_far", "shin_far"], "end": "foot_far", "pole": [1, 0],
                    "gait": {"phase": 0.0625, "stance": 0.625, "lift": 3, "roll": 8, "x": 55}},
            "near": {"bones": ["thigh_near", "shin_near"], "end": "foot_near", "pole": [-1, 0],
                     "gait": {"phase": 0.5625, "stance": 0.625, "lift": 3, "roll": 8, "x": 73}},
        },
    }
    attack = {
        "frames": 7, "loop": False, "duration_ms": [90, 90, 70, 90, 100, 110, 150],
        "events": [{"t": 0.5, "name": "hit"}],
        "tracks": {
            "torso": {"rotate": wave([0, -4 * swing, -8 * swing, 8 * swing, 5 * swing, 2 * swing, 0])},
            "weapon": {"rotate": wave([0, -14 * swing, -25 * swing, 24 * swing, 16 * swing, 6 * swing, 0])},
            "arm_left": {"rotate": wave([0, -8 * swing, -15 * swing, 15 * swing, 8 * swing, 2 * swing, 0])},
            "arm_right": {"rotate": wave([0, -8 * swing, -15 * swing, 15 * swing, 8 * swing, 2 * swing, 0])},
        },
    }
    death = {
        "frames": 8, "loop": False, "duration_ms": [100, 90, 80, 80, 90, 110, 160, 300], "grounded": False,
        "tracks": {
            "hips": {"translate": wave([[0, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 5], [0, 6], [0, 6]])},
            "torso": {"rotate": wave([0, 3, 8, 15, 22, 29, 34, 36])},
            "head": {"rotate": wave([0, 2, 5, 9, 13, 17, 19, 20])},
            "weapon": {"rotate": wave([0, -5 * swing, -10 * swing, -15 * swing, -21 * swing, -26 * swing, -29 * swing, -30 * swing])},
            "thigh_far": {"rotate": wave([0, 0, 5, 11, 18, 23, 25, 25])},
            "thigh_near": {"rotate": wave([0, 0, -5, -11, -18, -23, -25, -25])},
        },
    }
    return {
        "schema": "codeart2d.rig_anim.v1", "rig": f"pangu-{view}.rig.svg",
        "states": {"idle": "idle", "moving": "walk", "attack": "attack", "death": "death"},
        "entry_reference": "idle", "clips": {"idle": idle, "walk": walk, "attack": attack, "death": death},
    }


if __name__ == "__main__":
    for direction in ("front", "left", "back"):
        (ROOT / f"pangu-{direction}.rig.svg").write_text(make_rig(direction), encoding="utf-8")
        (ROOT / f"pangu-{direction}.anim.json").write_text(
            json.dumps(make_anim(direction), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
