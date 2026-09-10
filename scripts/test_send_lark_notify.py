from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("send-lark-notify.py")
SPEC = importlib.util.spec_from_file_location("send_lark_notify", SCRIPT)
assert SPEC and SPEC.loader
notify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(notify)


class LarkNotifyTest(unittest.TestCase):
    def test_card_contains_first_five_projects(self) -> None:
        edition = {
            "date": "2026-09-10", "issue": 4, "summary": "今日精选",
            "projects": [
                {"name": f"owner/p{i}", "githubUrl": f"https://github.com/owner/p{i}", "plainSummary": f"摘要{i}"}
                for i in range(7)
            ],
        }
        card = notify.build_card(edition, "https://example.com")
        rendered = json.dumps(card, ensure_ascii=False)
        self.assertIn("owner/p0", rendered)
        self.assertIn("owner/p4", rendered)
        self.assertNotIn("owner/p5", rendered)
        self.assertIn("https://example.com", rendered)

    def test_local_edition_fallback(self) -> None:
        edition = {"date": "2026-09-10", "projects": [{"name": "owner/repo"}]}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "src/data/editions/2026-09-10.json"
            target.parent.mkdir(parents=True)
            target.write_text(json.dumps(edition), encoding="utf-8")
            with patch.object(notify, "ROOT", root), patch.object(notify, "request_json", side_effect=RuntimeError("offline")):
                self.assertEqual(notify.load_edition("2026-09-10")["date"], "2026-09-10")


if __name__ == "__main__":
    unittest.main()
