"""Bygg en visuell, test-only sammenligning av Oppgave 2 mot Excel-fasit."""

from __future__ import annotations

import html
import json
import sys
from datetime import datetime
from pathlib import Path

import duckdb


CODE_ROOT = Path(__file__).resolve().parents[1]
ROOT = CODE_ROOT.parent
REPO_ROOT = ROOT.parent
sys.path.insert(0, str(CODE_ROOT))
sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import load_data_contract  # noqa: E402
from tests.fasit_support import grouped_finance_fasit_rows_frame  # noqa: E402


CONTRACT = load_data_contract(REPO_ROOT)
CALCULATED_PATH = CONTRACT.generated_dir("oppgave2") / "evidence" / "grouped_finance_rows.parquet"
OUTPUT_PATH = CONTRACT.generated_dir("oppgave2") / "reports" / "oppgave2_kontogruppering_sammenligning.html"
TOLERANCE = 0.00001

FASIT_FILES = {
    "154301": "manifest:fasit.account_grouping_154301",
    "alle": "manifest:fasit.account_grouping_all",
}

FIELDS = [
    ("virksomhet_budsjett_tusen", "Budsjett 01–03", "number"),
    ("hovedbok_tusen", "Hovedbok", "number"),
    ("avvik_tusen", "Avvik", "number"),
    ("aarets_budsjett_tusen", "Årsbudsjett", "number"),
    ("forbruk_av_aarets_budsjett", "Forbruk av årsbudsjett", "percent"),
    *[
        (f"budsjett_{period}_tusen", label, "number")
        for period, label in zip(
            range(202601, 202613),
            [
                "Januar",
                "Februar",
                "Mars",
                "April",
                "Mai",
                "Juni",
                "Juli",
                "August",
                "September",
                "Oktober",
                "November",
                "Desember",
            ],
            strict=True,
        )
    ],
    ("kontant_budsjett_tusen", "Kontantbudsjett", "number"),
    ("kontant_tusen", "Kontant", "number"),
    ("kontant_avvik_tusen", "Kontantavvik", "number"),
]


def clean_number(value: object) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return None if number != number else number


def comparable(value: object) -> float:
    number = clean_number(value)
    return 0.0 if number is None else number


def comparison_data() -> tuple[list[dict[str, object]], list[dict[str, object]], dict[str, object]]:
    if not CALCULATED_PATH.exists():
        raise FileNotFoundError(
            f"Mangler {CALCULATED_PATH}. Kjør npm run prepare:data."
        )

    connection = duckdb.connect()
    try:
        calculated = connection.execute(
            f"""
            select *
            from read_parquet('{CALCULATED_PATH.as_posix()}')
            where rapportperiode = 'p1_3'
              and finansiering in ('154301', 'alle')
            """
        ).df()
    finally:
        connection.close()

    # Leser Excel-fasit direkte hver gang rapporten bygges. Den normaliserte
    # fasiten brukes bare i denne kontrollrapporten, aldri som beregningskilde.
    expected = grouped_finance_fasit_rows_frame()

    rows: list[dict[str, object]] = []
    totals: list[dict[str, object]] = []
    summary: dict[str, object] = {}

    for financing in ("154301", "alle"):
        calculated_accounts = calculated[
            (calculated["finansiering"] == financing)
            & (calculated["row_type"] == "account")
        ].set_index("konto")
        expected_accounts = expected[
            (expected["finansiering"] == financing)
            & (expected["row_type"] == "account")
        ]

        exact = 0
        comparisons = 0
        mismatches = 0
        for expected_row in expected_accounts.itertuples(index=False):
            account = str(expected_row.konto)
            calculated_row = (
                calculated_accounts.loc[account]
                if account in calculated_accounts.index
                else None
            )
            for field, label, value_format in FIELDS:
                expected_value = clean_number(getattr(expected_row, field))
                calculated_value = (
                    None
                    if calculated_row is None
                    else clean_number(calculated_row[field])
                )
                difference = comparable(calculated_value) - comparable(expected_value)
                is_exact = abs(difference) <= TOLERANCE
                comparisons += 1
                exact += int(is_exact)
                mismatches += int(not is_exact)
                rows.append(
                    {
                        "finansiering": financing,
                        "konto": account,
                        "konto_navn": expected_row.konto_navn or "",
                        "felt": field,
                        "felt_tekst": label,
                        "format": value_format,
                        "excel": expected_value,
                        "beregnet": calculated_value,
                        "differanse": difference,
                        "status": "eksakt" if is_exact else "avvik",
                    }
                )

        expected_total = expected[
            (expected["finansiering"] == financing)
            & (expected["radtekst"] == "Driftskostnader")
        ].iloc[0]
        calculated_total = calculated[
            (calculated["finansiering"] == financing)
            & (calculated["radtekst"] == "Driftskostnader")
        ].iloc[0]
        for field, label, value_format in FIELDS:
            expected_value = clean_number(expected_total[field])
            calculated_value = clean_number(calculated_total[field])
            difference = comparable(calculated_value) - comparable(expected_value)
            totals.append(
                {
                    "finansiering": financing,
                    "felt": field,
                    "felt_tekst": label,
                    "format": value_format,
                    "excel": expected_value,
                    "beregnet": calculated_value,
                    "differanse": difference,
                    "status": "eksakt" if abs(difference) <= TOLERANCE else "avvik",
                }
            )

        extra_accounts = sorted(
            set(calculated_accounts.index.astype(str))
            - set(expected_accounts["konto"].astype(str))
        )
        summary[financing] = {
            "accounts": int(len(expected_accounts)),
            "comparisons": comparisons,
            "exact": exact,
            "mismatches": mismatches,
            "extra_zero_accounts": extra_accounts,
            "fasit_file": FASIT_FILES[financing],
        }

    return rows, totals, summary


def render() -> str:
    rows, totals, summary = comparison_data()
    payload = json.dumps(
        {"rows": rows, "totals": totals, "summary": summary},
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("</", "<\\/")
    field_options = "\n".join(
        f'<option value="{html.escape(field)}">{html.escape(label)}</option>'
        for field, label, _ in FIELDS
    )
    generated = datetime.now().strftime("%d.%m.%Y %H:%M")

    return f"""<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Oppgave 2 – sammenligning mot Excel</title>
  <style>
    :root{{--navy:#153552;--blue:#0d5d91;--green:#237647;--red:#b33b32;--amber:#a96810;--bg:#edf2f6;--panel:#fff;--line:#d5dee7;--muted:#647386}}
    *{{box-sizing:border-box}} body{{margin:0;background:var(--bg);font-family:Arial,sans-serif;color:#172638}}
    header{{padding:22px 28px;background:var(--navy);color:#fff;border-bottom:4px solid #3892c8}}
    header h1{{margin:0 0 7px;font-size:28px}} header p{{margin:0;color:#d8e8f4;line-height:1.5}}
    main{{max-width:1500px;margin:auto;padding:20px}} .switch{{display:flex;gap:8px;margin-bottom:14px}}
    button,select,label.toggle{{border:1px solid #b9c8d5;border-radius:7px;background:#fff;padding:10px 14px;font-weight:700;color:#29435b}}
    button{{cursor:pointer}} button.active{{background:var(--blue);border-color:var(--blue);color:#fff}}
    .cards{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}}
    .card,.panel{{background:var(--panel);border:1px solid var(--line);border-radius:9px;box-shadow:0 2px 8px #23384d14}}
    .card{{padding:16px}} .card span{{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;font-weight:700}}
    .card strong{{display:block;margin-top:6px;color:#07558b;font-size:27px}} .panel{{margin-bottom:14px;overflow:hidden}}
    .panel h2{{margin:0;padding:15px 18px;border-bottom:1px solid var(--line);font-size:18px}}
    .body{{padding:16px 18px}} .ok{{border-left:4px solid var(--green);background:#edf8f1;padding:12px 14px;border-radius:5px}}
    .warning{{border-left:4px solid var(--amber);background:#fff7e7;padding:12px 14px;border-radius:5px;margin-top:10px}}
    .source{{font-family:Consolas,monospace;font-size:12px;word-break:break-all}} .toolbar{{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 18px}}
    .toolbar label{{font-size:12px;color:var(--muted);font-weight:700}} .toolbar select{{display:block;margin-top:5px;min-width:210px}}
    label.toggle{{display:flex;gap:8px;align-items:center;margin-top:17px;font-size:13px}} .scroll{{overflow:auto;max-height:620px}}
    table{{width:100%;border-collapse:collapse;font-size:13px}} th,td{{padding:10px 12px;border-bottom:1px solid #e4eaf0;text-align:right;white-space:nowrap}}
    th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){{text-align:left}} thead th{{position:sticky;top:0;background:#f5f8fa;color:#52677a;z-index:1}}
    tr.bad{{background:#fff2f0}} .badge{{display:inline-block;padding:4px 8px;border-radius:99px;font-size:11px;font-weight:800}}
    .badge.ok{{background:#e5f4ea;color:var(--green)}} .badge.bad{{background:#fde6e3;color:var(--red)}} .muted{{color:var(--muted)}}
    footer{{padding:4px 0 24px;color:var(--muted);font-size:12px}}
    @media(max-width:850px){{.cards{{grid-template-columns:repeat(2,1fr)}}}}
  </style>
</head>
<body>
<header>
  <h1>Oppgave 2 – beregnet kontogruppering mot Excel-fasit</h1>
  <p>Periode 01–03 2026 · Beløp i NOK 1 000 · Fasit brukes kun til kontroll, aldri som beregningskilde.</p>
</header>
<main>
  <div class="switch">
    <button class="finance active" data-finance="154301">Finansiering 154301</button>
    <button class="finance" data-finance="alle">Alle finansieringer</button>
  </div>
  <section class="cards">
    <article class="card"><span>Excel-kontoer</span><strong id="accounts">–</strong></article>
    <article class="card"><span>Feltkontroller</span><strong id="checks">–</strong></article>
    <article class="card"><span>Eksakt</span><strong id="exact">–</strong></article>
    <article class="card"><span>Avvik</span><strong id="mismatches">–</strong></article>
  </section>
  <section class="panel">
    <h2>Konklusjon og datagrunnlag</h2>
    <div class="body">
      <div class="ok" id="conclusion"></div>
      <p><b>Excel-fasit:</b> <span class="source" id="fasit"></span></p>
      <p><b>Beregnet rapport:</b> <span class="source">ekstern generert mappe, oppgave2/evidence/grouped_finance_rows.parquet</span></p>
      <p><b>Operative hovedkilder:</b> <span class="source">data/agltransact.parquet + data/apltransact.parquet + data/apltransactvalue.parquet (2026B)</span></p>
      <div class="warning">Kontantkolonnene sammenlignes mot Excel og formelkontrolleres, men er ikke uavhengig avstemt fordi en separat operativ Parquet-kilde for kontant ennå mangler.</div>
    </div>
  </section>
  <section class="panel">
    <h2>Totalen «Driftskostnader»</h2>
    <div class="scroll"><table>
      <thead><tr><th>Felt</th><th>Excel</th><th>Beregnet</th><th>Differanse</th><th>Status</th></tr></thead>
      <tbody id="totals"></tbody>
    </table></div>
  </section>
  <section class="panel">
    <h2>Konto-for-konto</h2>
    <div class="toolbar">
      <label>Velg tallfelt<select id="field">{field_options}</select></label>
      <label class="toggle"><input id="onlyMismatch" type="checkbox"> Vis bare avvik</label>
      <span class="muted" id="rowCount"></span>
    </div>
    <div class="scroll"><table>
      <thead><tr><th>Konto</th><th>Kontonavn</th><th>Excel</th><th>Beregnet</th><th>Differanse</th><th>Status</th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
  </section>
  <footer>Generert {generated}. Bygges på nytt med <span class="source">uv run python scripts/build_task2_comparison_html.py</span>.</footer>
</main>
<script>
const data={payload};
let finance="154301";
const fmt=(value,type)=>{{
  if(value===null||value===undefined||Number.isNaN(Number(value))) return "–";
  if(type==="percent") return new Intl.NumberFormat("nb-NO",{{minimumFractionDigits:2,maximumFractionDigits:2}}).format(Number(value)*100)+" %";
  return new Intl.NumberFormat("nb-NO",{{minimumFractionDigits:3,maximumFractionDigits:3}}).format(Number(value));
}};
const badge=status=>`<span class="badge ${{status==="eksakt"?"ok":"bad"}}">${{status}}</span>`;
function render(){{
  const s=data.summary[finance];
  document.getElementById("accounts").textContent=s.accounts;
  document.getElementById("checks").textContent=s.comparisons;
  document.getElementById("exact").textContent=s.exact+" / "+s.comparisons;
  document.getElementById("mismatches").textContent=s.mismatches;
  document.getElementById("fasit").textContent=s.fasit_file;
  document.getElementById("conclusion").textContent=s.mismatches===0
    ? "Alle felt på alle Excel-kontoene matcher den beregnede rapporten innenfor toleransen."
    : `${{s.mismatches}} felt avviker og må undersøkes.`;
  document.getElementById("totals").innerHTML=data.totals.filter(r=>r.finansiering===finance).map(r=>
    `<tr class="${{r.status==="avvik"?"bad":""}}"><td>${{r.felt_tekst}}</td><td>${{fmt(r.excel,r.format)}}</td><td>${{fmt(r.beregnet,r.format)}}</td><td>${{fmt(r.differanse,r.format)}}</td><td>${{badge(r.status)}}</td></tr>`
  ).join("");
  renderRows();
}}
function renderRows(){{
  const field=document.getElementById("field").value;
  const only=document.getElementById("onlyMismatch").checked;
  const rows=data.rows.filter(r=>r.finansiering===finance&&r.felt===field&&(!only||r.status==="avvik"));
  document.getElementById("rowCount").textContent=`Viser ${{rows.length}} rader`;
  document.getElementById("rows").innerHTML=rows.map(r=>
    `<tr class="${{r.status==="avvik"?"bad":""}}"><td>${{r.konto}}</td><td>${{r.konto_navn}}</td><td>${{fmt(r.excel,r.format)}}</td><td>${{fmt(r.beregnet,r.format)}}</td><td>${{fmt(r.differanse,r.format)}}</td><td>${{badge(r.status)}}</td></tr>`
  ).join("");
}}
document.querySelectorAll(".finance").forEach(button=>button.addEventListener("click",()=>{{
  finance=button.dataset.finance;
  document.querySelectorAll(".finance").forEach(b=>b.classList.toggle("active",b===button));
  render();
}}));
document.getElementById("field").addEventListener("change",renderRows);
document.getElementById("onlyMismatch").addEventListener("change",renderRows);
render();
</script>
</body>
</html>"""


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(render(), encoding="utf-8")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
