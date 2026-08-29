from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.task3_rules import Task3RulesError, load_task3_rules


RULES_PATH = Path(__file__).resolve().parents[1] / "config" / "task3_rules.json"


class Task3RulesTest(unittest.TestCase):
    def test_repository_rules_are_complete(self) -> None:
        rules = load_task3_rules()

        self.assertEqual(rules.report_year, 2026)
        self.assertEqual(rules.budget_version, "2026B")
        self.assertEqual(rules.cash.section, "712")
        self.assertEqual(set(rules.workflow_candidates.completed_actions), {"ATTEST", "BDMGOD"})
        self.assertFalse(
            rules.workflow_candidates.include_amounts_in_calculations,
            "Ugodkjente workflowbeløp skal ikke påvirke regnskapstall",
        )

    def test_overlapping_account_ranges_are_rejected(self) -> None:
        raw = json.loads(RULES_PATH.read_text(encoding="utf-8"))
        raw["account_categories"]["Avskrivninger"] = [5900, 6109]
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "rules.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaisesRegex(Task3RulesError, "overlapper"):
                load_task3_rules(path)
