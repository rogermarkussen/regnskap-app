import json
import subprocess
import unittest

from shared.budget_exclusions import budget_inclusion_sql
from shared.financing import financing_sql, report_financing
from shared.budget_version import budget_version_for_year, budget_version_sql


class FinancingTest(unittest.TestCase):
    def test_confirmed_duplicate_only(self):
        rows = json.loads(subprocess.check_output([
            'duckdb', '-json', '-c',
            f"SELECT {budget_inclusion_sql()} included FROM (VALUES "
            "('5219663','2026RV','711'),('5733017','2026RV','771'),"
            "('42','2026RV','711'),('5219663','2026B','711'),"
            "('5219663','2026RV',NULL),(NULL,'2026RV','711')) h(trans_id,version,dim_1)"
        ], text=True))
        self.assertEqual([row['included'] for row in rows], [False, True, True, True, True, True])

    def test_selected_budget_versions(self):
        rows = json.loads(subprocess.check_output([
            'duckdb', '-json', '-c',
            f"SELECT year, {budget_version_sql('year')} AS version FROM (VALUES (2024),(2025),(2026)) t(year)"
        ], text=True))
        self.assertEqual([row['version'] for row in rows], ['2024B', '2025B', '2026RV'])
        for row in rows:
            self.assertEqual(row['version'], budget_version_for_year(row['year']))

    def test_python_and_sql_keep_actual_financing_and_blanks(self):
        rows = json.loads(subprocess.check_output([
            'duckdb', '-json', '-c',
            f"SELECT code, {financing_sql('code')} AS financing FROM (VALUES "
            "('154301'),('154345'),('154322'),('045101'),('45101'),('150021'),('154122'),(''),(NULL)) t(code)"
        ], text=True))
        self.assertEqual(len(rows), 9)
        for row in rows:
            self.assertEqual(row['financing'], report_financing(row['code']))
        self.assertEqual(report_financing(None), 'Uten finansiering')
        self.assertEqual(report_financing('150021'), '150021')


if __name__ == '__main__':
    unittest.main()
