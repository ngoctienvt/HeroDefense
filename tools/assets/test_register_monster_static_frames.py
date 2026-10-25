"""Regression checks for shared-scale registration; run explicitly when requested."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image


SCRIPT = (Path(__file__).resolve().parents[2] / "assets/sprites/monster-motion/"
          "art-storm-ray/source/actions/attack/south/register-static-frames.py")
SPEC = importlib.util.spec_from_file_location("register_monster_frames", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
REGISTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REGISTER)


class RegistrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "asset"
        self.root.mkdir()
        for index in range(2):
            image = Image.new("RGBA", (20, 20))
            for x in range(4 + index, 16):
                for y in range(4, 16):
                    image.putpixel((x, y), (220, 90, 40, 255))
            image.putpixel((3 + index, 4), (220, 90, 40, 80))
            image.save(self.root / f"pose-{index}.png")
        self.data = {
            "sourceCanvas": [20, 20], "outputCanvas": [80, 80],
            "targetAnchorPx": [40, 50], "sourceScale": 2,
            "frames": [
                {"index": i, "source": f"pose-{i}.png", "sourceAnchorPx": [10, 18]}
                for i in range(2)
            ],
        }

    def write_map(self) -> Path:
        path = self.root / "registration.json"
        path.write_text(json.dumps(self.data), encoding="utf-8")
        return path

    def test_one_scale_is_applied_to_every_pose_without_fitting_bounds(self) -> None:
        originals = [(self.root / f"pose-{i}.png").read_bytes() for i in range(2)]
        result_path = REGISTER.run(self.write_map(), self.root / "registered", self.root)
        result = json.loads(result_path.read_text(encoding="utf-8"))
        visible_widths = []
        for frame in result["frames"]:
            self.assertEqual(frame["scale"], 2)
            self.assertEqual(frame["actualRasterScaleXY"], [2, 2])
            self.assertEqual(frame["outputAnchorPx"], [40, 50])
            self.assertFalse(frame["cropped"])
            with Image.open(self.root / "registered" / frame["output"]) as image:
                self.assertEqual(image.size, (80, 80))
                bounds = image.getchannel("A").point(lambda alpha: 255 if alpha > 127 else 0).getbbox()
                self.assertIsNotNone(bounds)
                visible_widths.append(bounds[2] - bounds[0])
        # The source poses differ by one pixel in width, so a common 2x
        # transform must preserve a two-pixel difference instead of fitting both.
        self.assertEqual(visible_widths[0] - visible_widths[1], 2)
        for index, original in enumerate(originals):
            self.assertEqual((self.root / f"pose-{index}.png").read_bytes(), original)

    def test_nonfinite_scale_is_rejected(self) -> None:
        self.data["sourceScale"] = float("nan")
        with self.assertRaisesRegex(ValueError, "finite positive"):
            REGISTER.run(self.write_map(), self.root / "registered", self.root)

    def test_frame_path_cannot_escape_the_asset(self) -> None:
        self.data["frames"][0]["source"] = "../outside.png"
        with self.assertRaisesRegex(ValueError, "escapes"):
            REGISTER.run(self.write_map(), self.root / "registered", self.root)


if __name__ == "__main__":
    unittest.main()
