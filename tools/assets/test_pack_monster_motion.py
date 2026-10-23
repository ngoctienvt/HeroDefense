"""Regression coverage for manifest-based monster motion packing."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image


PACKER_PATH = Path(__file__).with_name("pack-monster-motion.py")
SPEC = importlib.util.spec_from_file_location("pack_monster_motion", PACKER_PATH)
assert SPEC is not None and SPEC.loader is not None
PACKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACKER)


class PackMonsterMotionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.asset_id = "art-test"
        self.asset_root = self.root / "assets" / self.asset_id
        source = self.asset_root / "source"
        source.mkdir(parents=True)

        frame = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
        frame.putpixel((3, 4), (180, 100, 70, 255))
        frame.save(source / "frame.png")

        directions = ["south", "west", "north", "east"]
        actions = {"idle": (1, False), "walk": (2, True), "attack": (2, False)}
        clips = []
        for action, (frame_count, loop) in actions.items():
            for direction in directions:
                clips.append({
                    "action": action,
                    "direction": direction,
                    "frames": ["source/frame.png"] * frame_count,
                    "durationsMs": [100] * frame_count,
                    "loop": loop,
                })

        profile = {
            "schema": "monster-art-profile.v1",
            "id": self.asset_id,
            "displayHeightWorld": 2,
            "motionEnvelopePx": [8, 8],
            "anchor": [4, 7],
            "directionOrder": directions,
            "directionAnchors": {direction: {"anchorPx": [4, 7]} for direction in directions},
            "actions": {action: {"framesPerDirection": count, "loop": loop}
                        for action, (count, loop) in actions.items()},
            "status": {"motion": "motion-approved", "directions": "directions-approved"},
        }
        manifest = {
            "schema": "monster-motion-export.v1",
            "assetId": self.asset_id,
            "sourceCanvas": [8, 8],
            "cellSize": [16, 16],
            "padding": 1,
            "maxAtlasEdge": 16,
            "clips": clips,
        }
        (self.asset_root / "asset.json").write_text(json.dumps(profile), encoding="utf-8")
        (source / "export-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_packs_motion_approved_profile_to_runtime_manifest(self) -> None:
        output = self.root / "public-assets"
        with patch.object(PACKER, "SOURCE", self.root / "assets"), patch.object(PACKER, "OUTPUT", output):
            PACKER.pack_profile(self.asset_id)

        runtime = json.loads((output / "monster-motion-art-test.json").read_text(encoding="utf-8"))
        self.assertEqual(runtime["schema"], "monster-motion-runtime.v1")
        self.assertEqual(len(runtime["clips"]), 12)
        self.assertTrue(runtime["pages"])

        web = self.asset_root / "web"
        review_manifest = json.loads((web / "monster-motion-art-test.json").read_text(encoding="utf-8"))
        qa = json.loads((web / "qa.json").read_text(encoding="utf-8"))
        self.assertTrue(all((web / page).is_file() for page in review_manifest["pages"]))
        self.assertEqual(qa["visualReview"], "pending-human-review")
        self.assertTrue(all((web / preview).is_file() for preview in qa["previews"]))

    def test_refuses_path_syntax_in_profile_action_names(self) -> None:
        profile_path = self.asset_root / "asset.json"
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        profile["actions"]["../outside"] = profile["actions"].pop("walk")
        profile_path.write_text(json.dumps(profile), encoding="utf-8")
        output = self.root / "public-assets"

        with patch.object(PACKER, "SOURCE", self.root / "assets"), patch.object(PACKER, "OUTPUT", output):
            with self.assertRaisesRegex(ValueError, "Invalid profile action name"):
                PACKER.pack_profile(self.asset_id)

        self.assertFalse(output.exists())

    def test_refuses_unapproved_direction_set_before_writing_output(self) -> None:
        profile_path = self.asset_root / "asset.json"
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        profile["status"]["directions"] = "pending"
        profile_path.write_text(json.dumps(profile), encoding="utf-8")
        output = self.root / "public-assets"

        with patch.object(PACKER, "SOURCE", self.root / "assets"), patch.object(PACKER, "OUTPUT", output):
            with self.assertRaisesRegex(ValueError, "directions are not directions-approved"):
                PACKER.pack_profile(self.asset_id)

        self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
