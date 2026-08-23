from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import duckdb
import pandas as pd

try:
    from .project_data import task3_sources
except ImportError:
    from project_data import task3_sources


def workflow_invoice_frames(
    root: Path,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    sources = task3_sources()
    workflow_path = sources.workflow
    ledger_path = sources.ledger
    if not workflow_path.exists():
        raise FileNotFoundError(f"Mangler workflowdata: {workflow_path}")
    if not ledger_path.exists():
        raise FileNotFoundError(f"Mangler regnskapsdata: {ledger_path}")

    conn = duckdb.connect()
    try:
        invoices = conn.execute(
            f"""
            with workflow_base as (
              select
                trim(col2_value) as fakturanr,
                oid,
                task_id,
                wf_status,
                wf_user_id,
                real_user,
                action_code,
                trim(col1_value) as leverandor_navn,
                trim(col8_value) as workflow_leverandor_id,
                trim(col3_value) as workflow_bilagsnr,
                try_cast(col5_value as double) as workflow_belop_nok,
                try_cast(action_date as timestamptz) as action_ts,
                try_cast(distr_date as timestamptz) as distr_ts,
                try_cast(ready_date as timestamptz) as ready_ts,
                coalesce(
                  try_cast(action_date as timestamptz),
                  try_cast(ready_date as timestamptz),
                  try_cast(distr_date as timestamptz)
                ) as event_ts
              from read_parquet('{workflow_path.as_posix()}')
              where col2_descr = 'Fakturanr'
                and trim(coalesce(col2_value, '')) <> ''
            ),
            workflow_invoice as (
              select
                fakturanr,
                count(*) as workflow_rader,
                count(distinct oid) as workflow_flyter,
                count(distinct leverandor_navn) as workflow_leverandorer,
                count(distinct workflow_leverandor_id) as workflow_leverandor_id_antall,
                string_agg(
                  distinct workflow_leverandor_id,
                  ', ' order by workflow_leverandor_id
                ) as workflow_leverandor_id,
                min(leverandor_navn) as leverandor_navn,
                max(workflow_belop_nok) as workflow_belop_maks_nok,
                count(distinct workflow_belop_nok) as workflow_belop_antall,
                string_agg(
                  distinct workflow_bilagsnr,
                  ', ' order by workflow_bilagsnr
                ) as workflow_bilagsnr,
                count(*) filter (where wf_status = 'ACT') as aktive_oppgaver,
                count(distinct wf_user_id) filter (where wf_status = 'ACT') as aktive_brukere_antall,
                string_agg(
                  distinct wf_user_id,
                  ', ' order by wf_user_id
                ) filter (where wf_status = 'ACT') as aktive_brukere,
                arg_max(wf_status, event_ts) as siste_oppgavestatus,
                arg_max(action_code, action_ts) as siste_handling,
                arg_max(real_user, action_ts) as sist_behandlet_av,
                max(action_ts) as siste_handling_tid,
                max(event_ts) as siste_hendelse_tid
              from workflow_base
              group by fakturanr
            ),
            ledger_base as (
              select
                trim(ext_inv_ref) as fakturanr,
                trim(apar_id) as leverandor_id,
                trim(voucher_no) as bilagsnr,
                trim(period) as periode,
                trim(dim_4) as finansiering,
                trim(account) as konto,
                try_cast(voucher_date as timestamptz) as bilagsdato
              from read_parquet('{ledger_path.as_posix()}')
              where trim(coalesce(ext_inv_ref, '')) <> ''
            ),
            ledger_invoice as (
              select
                fakturanr,
                count(*) as regnskapsrader,
                count(distinct leverandor_id) as regnskap_leverandorer,
                string_agg(
                  distinct leverandor_id,
                  ', ' order by leverandor_id
                ) as regnskap_leverandor_id,
                count(distinct bilagsnr) as regnskap_bilag_antall,
                string_agg(distinct bilagsnr, ', ' order by bilagsnr) as regnskap_bilagsnr,
                string_agg(distinct periode, ', ' order by periode) as perioder,
                string_agg(
                  distinct finansiering,
                  ', ' order by finansiering
                ) as finansieringer,
                string_agg(distinct konto, ', ' order by konto) as kontoer,
                min(bilagsdato) as forste_bilagsdato,
                max(bilagsdato) as siste_bilagsdato
              from ledger_base
              group by fakturanr
            )
            select
              workflow_invoice.*,
              case
                when workflow_belop_antall = 1 then workflow_belop_maks_nok
                else null
              end as workflow_belop_nok,
              case
                when aktive_oppgaver > 0 then 'Har aktive oppgaver'
                when siste_oppgavestatus = 'FIN' then 'Fullført'
                when siste_oppgavestatus = 'REJ' then 'Avvist'
                when siste_oppgavestatus = 'FWD' then 'Videresendt'
                when siste_oppgavestatus = 'TMD' then 'Tidsstyrt'
                else coalesce(siste_oppgavestatus, 'Ukjent')
              end as workflow_status,
              ledger_invoice.* exclude (fakturanr),
              case
                when ledger_invoice.fakturanr is null then 'Ikke matchet'
                when workflow_flyter = 1
                  and workflow_leverandor_id_antall = 1
                  and regnskap_leverandorer = 1
                  and workflow_leverandor_id = regnskap_leverandor_id
                  then 'Sikker'
                when workflow_flyter = 1
                  and coalesce(regnskap_leverandorer, 0) <= 1
                  then 'Mulig'
                else 'Tvetydig'
              end as koblingskvalitet,
              case
                when ledger_invoice.fakturanr is null
                  then 'Fakturanummeret mangler i mottatt hovedbokssnapshot'
                when workflow_flyter > 1 and workflow_leverandor_id_antall > 1
                  then 'Flere workflowflyter og flere workflowleverandører'
                when workflow_flyter > 1
                  then 'Flere workflowflyter deler fakturanummer'
                when workflow_leverandor_id_antall > 1
                  then 'Flere workflowleverandører deler fakturanummer'
                when regnskap_leverandorer > 1
                  then 'Flere regnskapsleverandører deler fakturanummer'
                when workflow_leverandor_id <> regnskap_leverandor_id
                  then 'Leverandør-id er ulik mellom workflow og regnskap'
                when workflow_leverandor_id is null or regnskap_leverandor_id is null
                  then 'Leverandør-id mangler i én av kildene'
                else 'Entydig fakturanummer og leverandør-id'
              end as koblingsaarsak,
              'manifest:task3.workflow' as workflow_kilde,
              'manifest:common.ledger' as regnskap_kilde
            from workflow_invoice
            left join ledger_invoice using (fakturanr)
            order by siste_hendelse_tid desc nulls last, fakturanr
            """
        ).df()

        events = conn.execute(
            f"""
            select
              trim(col2_value) as fakturanr,
              oid,
              task_id,
              orig_task_id,
              node_id,
              task_group,
              wf_status,
              case wf_status
                when 'ACT' then 'Aktiv oppgave'
                when 'FIN' then 'Fullført/behandlet oppgave'
                when 'FWD' then 'Videresendt oppgave'
                when 'REJ' then 'Avvist oppgave'
                when 'TMD' then 'Tids-/ventestyrt – må bekreftes'
                when 'WTN' then 'Venter – må bekreftes'
                else 'Ukjent oppgavestatus'
              end as oppgavestatus_tekst,
              action_code,
              case
                when wf_status = 'ACT' and action_code is null
                  then 'Ingen utført handling – oppgaven er aktiv'
                when action_code = 'ATTEST' then 'Attestrelatert handling fullført'
                when action_code = 'BDMGOD' then 'BDM-godkjenningsrelatert handling fullført'
                when action_code = 'AP' then 'Fullført handling (AP) – kodebetydning må bekreftes'
                when action_code = 'FW' then 'Videresendt'
                when action_code = 'ES' then 'Tids-/ventestyrt handling (ES) – må bekreftes'
                when action_code = 'AVVATT' then 'Avvist ved atteststeg'
                when action_code = 'AVVREG' then 'Avvist ved registreringssteg'
                when action_code = 'RJ' then 'Avvist (RJ) – kodebetydning må bekreftes'
                when action_code = 'UI' then 'Fullført handling (UI) – kodebetydning må bekreftes'
                when action_code is null then 'Ingen registrert handling'
                else 'Ukjent handling (' || action_code || ')'
              end as handling_tekst,
              wf_user_id,
              real_user,
              orig_user,
              try_cast(action_date as timestamptz) as action_tid,
              try_cast(distr_date as timestamptz) as distribuert_tid,
              try_cast(ready_date as timestamptz) as klar_tid,
              coalesce(
                try_cast(action_date as timestamptz),
                try_cast(ready_date as timestamptz),
                try_cast(distr_date as timestamptz)
              ) as hendelse_tid,
              wf_status = 'ACT' as er_aktiv
            from read_parquet('{workflow_path.as_posix()}')
            where col2_descr = 'Fakturanr'
              and trim(coalesce(col2_value, '')) <> ''
            order by fakturanr, oid, hendelse_tid, try_cast(task_id as integer)
            """
        ).df()

        raw_summary = conn.execute(
            f"""
            select
              count(*) as workflow_rader,
              count(distinct oid) as workflow_flyter,
              count(*) filter (
                where col2_descr <> 'Fakturanr'
                  or trim(coalesce(col2_value, '')) = ''
              ) as rader_uten_standard_fakturanr
            from read_parquet('{workflow_path.as_posix()}')
            """
        ).fetchone()
        source_coverage = conn.execute(
            f"""
            select
              cast((
                select max(
                  coalesce(
                    try_cast(action_date as timestamptz),
                    try_cast(ready_date as timestamptz),
                    try_cast(distr_date as timestamptz)
                  )
                )
                from read_parquet('{workflow_path.as_posix()}')
              ) as varchar) as seneste_workflowhendelse,
              (
                select max(try_cast(voucher_date as date))
                from read_parquet('{ledger_path.as_posix()}')
              ) as seneste_bilagsdato,
              (
                select max(trim(period))
                from read_parquet('{ledger_path.as_posix()}')
              ) as seneste_hovedboksperiode
            """
        ).fetchone()
    finally:
        conn.close()

    metadata = pd.DataFrame(
        [
            {
                "snapshot_status": "Uttrekkstidspunkt mangler i kildene",
                "workflow_kilde": "manifest:task3.workflow",
                "workflow_fil_endret": datetime.fromtimestamp(
                    workflow_path.stat().st_mtime, tz=timezone.utc
                ).isoformat(),
                "seneste_workflowhendelse": source_coverage[0],
                "regnskap_kilde": "manifest:common.ledger",
                "regnskap_fil_endret": datetime.fromtimestamp(
                    ledger_path.stat().st_mtime, tz=timezone.utc
                ).isoformat(),
                "seneste_bilagsdato": source_coverage[1],
                "seneste_hovedboksperiode": source_coverage[2],
            }
        ]
    )

    def validation(check: str, status: str, count: int, detail: str) -> dict[str, object]:
        return {
            "kontroll": check,
            "status": status,
            "antall": int(count),
            "detalj": detail,
        }

    quality_counts = invoices["koblingskvalitet"].value_counts()
    ambiguous_reason_counts = invoices.loc[
        invoices["koblingskvalitet"] == "Tvetydig", "koblingsaarsak"
    ].value_counts()
    active_count = int((invoices["aktive_oppgaver"] > 0).sum())
    multiple_flows = int((invoices["workflow_flyter"] > 1).sum())
    varying_amounts = int((invoices["workflow_belop_antall"] > 1).sum())
    validations = pd.DataFrame(
        [
            validation(
                "Workflowgrunnlag",
                "ok",
                raw_summary[0],
                f"{raw_summary[0]} oppgaver i {raw_summary[1]} workflowflyter.",
            ),
            validation(
                "Fakturaer med standardnøkkel",
                "ok",
                len(invoices),
                f"{len(invoices)} unike fakturanumre. {raw_summary[2]} rader tilhører andre workflowtyper eller mangler standard fakturanummer.",
            ),
            validation(
                "Sikker regnskapskobling",
                "ok",
                quality_counts.get("Sikker", 0),
                "Fakturanummer og leverandør-id identifiserer én workflowflyt og én regnskapsleverandør.",
            ),
            validation(
                "Tvetydig regnskapskobling",
                "warning" if quality_counts.get("Tvetydig", 0) else "ok",
                quality_counts.get("Tvetydig", 0),
                (
                    f"{ambiguous_reason_counts.get('Flere workflowflyter deler fakturanummer', 0)} har flere flyter med én workflowleverandør; "
                    f"{ambiguous_reason_counts.get('Flere workflowflyter og flere workflowleverandører', 0)} har både flere flyter og leverandører."
                ),
            ),
            validation(
                "Ingen regnskapskobling",
                "warning" if quality_counts.get("Ikke matchet", 0) else "ok",
                quality_counts.get("Ikke matchet", 0),
                "Fakturanummeret finnes i workflow, men ikke som ext_inv_ref i regnskapsuttrekket.",
            ),
            validation(
                "Flere workflowflyter per fakturanummer",
                "warning" if multiple_flows else "ok",
                multiple_flows,
                "Disse fakturanumrene må ikke behandles som entydige uten flere nøkler.",
            ),
            validation(
                "Varierende workflowbeløp",
                "warning" if varying_amounts else "ok",
                varying_amounts,
                "Beløpsfeltet varierer mellom oppgaver for samme fakturanummer og brukes derfor ikke som primær koblingsnøkkel.",
            ),
            validation(
                "Fakturaer med aktive oppgaver",
                "ok",
                active_count,
                "Aktiv betyr at minst én underliggende workflowoppgave har status ACT.",
            ),
        ]
    )
    return invoices, events, validations, metadata
