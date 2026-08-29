from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


class Task3RulesError(ValueError):
    pass


@dataclass(frozen=True)
class AccountRange:
    first: int
    last: int


@dataclass(frozen=True)
class CashRule:
    section: str
    account: str
    financing: str
    budget_nok: float


@dataclass(frozen=True)
class WorkflowCandidateRule:
    active_status: str
    completed_actions: tuple[str, ...]
    stale_after_days: int
    include_amounts_in_calculations: bool


@dataclass(frozen=True)
class Task3Rules:
    rule_version: str
    approval_status: str
    report_year: int
    budget_version: str
    sections: tuple[str, ...]
    account_categories: dict[str, AccountRange]
    budget_financing_by_section: dict[str, str]
    budget_financing_default: str
    combined_financing_members: tuple[str, ...]
    combined_financing_label: str
    cash: CashRule
    workflow_candidates: WorkflowCandidateRule


def load_task3_rules(path: Path | None = None) -> Task3Rules:
    source = path or Path(__file__).resolve().parents[1] / "config" / "task3_rules.json"
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise Task3RulesError(f"Kan ikke lese Oppgave 3-reglene: {exc}") from exc
    if raw.get("schema_version") != 1:
        raise Task3RulesError("Oppgave 3-reglene må ha schema_version 1")

    categories = {
        name: AccountRange(int(bounds[0]), int(bounds[1]))
        for name, bounds in raw["account_categories"].items()
    }
    required_categories = {"Lønnskostnader", "Avskrivninger", "ADK"}
    if set(categories) != required_categories:
        raise Task3RulesError(f"Kontokategoriene må være {sorted(required_categories)}")
    ordered = sorted(categories.values(), key=lambda value: value.first)
    if any(item.first > item.last for item in ordered):
        raise Task3RulesError("Et kontointervall har start etter slutt")
    if any(left.last >= right.first for left, right in zip(ordered, ordered[1:])):
        raise Task3RulesError("Kontointervallene overlapper")

    sections = tuple(str(value) for value in raw["sections"])
    if len(sections) != len(set(sections)) or not sections:
        raise Task3RulesError("Seksjonslisten må være unik og ikke tom")
    workflow = raw["workflow_candidates"]
    actions = tuple(str(value) for value in workflow["completed_actions"])
    if not actions:
        raise Task3RulesError("Workflowutvalget må ha minst én fullført handling")
    cash = raw["cash_712"]
    combined = raw["combined_financing"]
    budget = raw["budget_financing"]

    return Task3Rules(
        rule_version=str(raw["rule_version"]),
        approval_status=str(raw["approval_status"]),
        report_year=int(raw["report_year"]),
        budget_version=str(raw["budget_version"]),
        sections=sections,
        account_categories=categories,
        budget_financing_by_section={str(key): str(value) for key, value in budget["by_section"].items()},
        budget_financing_default=str(budget["default"]),
        combined_financing_members=tuple(str(value) for value in combined["members"]),
        combined_financing_label=str(combined["label"]),
        cash=CashRule(
            section=str(cash["section"]),
            account=str(cash["account"]),
            financing=str(cash["financing"]),
            budget_nok=float(cash["budget_nok"]),
        ),
        workflow_candidates=WorkflowCandidateRule(
            active_status=str(workflow["active_status"]),
            completed_actions=actions,
            stale_after_days=int(workflow["stale_after_days"]),
            include_amounts_in_calculations=bool(
                workflow.get("include_amounts_in_calculations", False)
            ),
        ),
    )
