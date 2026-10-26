"""Research provenance and accuracy claims validation (no training data required)."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ResearchEvidenceTests(unittest.TestCase):
    def test_dataset_manifest_categories(self):
        manifest = json.loads((ROOT / "research/dataset_manifest.json").read_text())
        self.assertEqual(len(manifest["entries"]), 8)
        self.assertEqual(len({entry["label"] for entry in manifest["entries"]}), 8)

    def test_permissions_cannot_be_asserted_without_evidence(self):
        manifest = json.loads((ROOT / "research/dataset_manifest.json").read_text())
        for entry in manifest["entries"]:
            if entry["permission_status"] == "verified":
                self.assertTrue(entry.get("license_or_permission"))
                self.assertTrue(entry.get("source_url"))
            else:
                self.assertIn(entry["permission_status"], ("unverified", "restricted"))

    def test_research_dashboard_matches_historical_metadata(self):
        metadata = json.loads((ROOT / "models/model_metadata.json").read_text())
        snapshot = (ROOT / "frontend/lib/research-evidence.ts").read_text()
        self.assertIn(str(metadata["total_training_samples"]), snapshot)
        self.assertIn(str(metadata["final_accuracy"]), snapshot)
        self.assertIn(str(metadata["final_val_accuracy"]), snapshot)

    def test_missing_metrics_disclosed(self):
        page = (ROOT / "frontend/app/research/page.tsx").read_text()
        self.assertIn("not recorded", page)
        self.assertIn("not proof", page.lower())
        self.assertIn("not a therapy", page)


if __name__ == "__main__":
    unittest.main()
