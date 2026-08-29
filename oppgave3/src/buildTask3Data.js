import { openLocalDuckDb } from './localDuckDb.js';

const SOURCE_FILES = [
  'agltransact.parquet', 'apltransact.parquet', 'apltransactvalue.parquet',
  'acatrans.parquet', 'awftaskfin.parquet'
];

const category = (alias) => `case
  when try_cast(${alias}.account as integer) between 5000 and 5999 then 'Lønnskostnader'
  when try_cast(${alias}.account as integer) between 6000 and 6109 then 'Avskrivninger'
  when try_cast(${alias}.account as integer) between 6110 and 7834 then 'ADK'
end`;

const SUMMARY_SQL = `
with closed_periods as (
  select periode from (
    select trim(period) as periode, max(try_cast(trans_date as date)) as siste_dato,
      count(*) filter (where try_cast(account as integer) between 5000 and 5999) as lonnsrader
    from read_parquet('agltransact.parquet')
    where regexp_matches(trim(period), '^20[0-9]{2}(0[1-9]|1[0-2])$') group by 1
  ) where lonnsrader > 0 and siste_dato >= last_day(strptime(periode || '01', '%Y%m%d'))
), actual_base as (
  select trim(dim_1) as seksjon,
    case when trim(dim_4) in ('154322', '045101') then '154322+045101'
      else coalesce(nullif(trim(dim_4), ''), 'Uten finansiering') end as finansiering,
    ${category('a')} as kategori, trim(period) as period,
    sum(try_cast(amount as double)) as hovedbok_nok, 0::double as budsjett_nok
  from read_parquet('agltransact.parquet') a
  where regexp_matches(trim(period), '^20[0-9]{2}(0[1-9]|1[0-2])$')
  group by 1, 2, 3, 4 having kategori is not null
), budget_base as (
  select trim(h.dim_1) as seksjon,
    case when trim(h.dim_1) = '212' then '154345'
      when trim(h.dim_1) = '761' then '154322+045101' else '154301' end as finansiering,
    ${category('h')} as kategori, trim(v.period) as period,
    0::double as hovedbok_nok,
    sum(coalesce(try_cast(v.amount as double), try_cast(v.amount1 as double))) as budsjett_nok
  from read_parquet('apltransact.parquet') h
  join read_parquet('apltransactvalue.parquet') v using (trans_id)
  where h.version = substr(trim(v.period), 1, 4) || 'B'
    and regexp_matches(trim(v.period), '^20[0-9]{2}(0[1-9]|1[0-2])$')
  group by 1, 2, 3, 4 having kategori is not null
), monthly as (
  select * from actual_base union all select * from budget_base
), scoped as (
  select 'Seksjon' as omfang, seksjon as omfang_id, finansiering, kategori, period,
    sum(hovedbok_nok) as hovedbok_nok, sum(budsjett_nok) as budsjett_nok
  from monthly where regexp_matches(seksjon, '^[0-9]{3}$') and seksjon <> '999' group by all
  union all
  select 'Nkom', 'Nkom', finansiering, kategori, period, sum(hovedbok_nok), sum(budsjett_nok)
  from monthly group by finansiering, kategori, period
), categories(kategori, sortering) as (
  values ('Lønnskostnader', 1), ('Avskrivninger', 2), ('ADK', 3)
), grid as (
  select distinct s.omfang, s.omfang_id, s.finansiering, c.kategori, c.sortering, p.periode
  from closed_periods p
  join scoped s on s.period between substr(p.periode, 1, 4) || '01' and p.periode
  cross join categories c
), measures as (
  select g.omfang, g.omfang_id, g.finansiering, g.kategori, g.sortering, g.periode,
    coalesce(sum(s.hovedbok_nok) filter (where s.period = g.periode), 0) as hovedbok_maaned_nok,
    coalesce(sum(s.budsjett_nok) filter (where s.period = g.periode), 0) as budsjett_maaned_nok,
    coalesce(sum(s.hovedbok_nok) filter (where try_cast(s.period as integer) = try_cast(g.periode as integer) - 1), 0) as hovedbok_forrige_nok,
    coalesce(sum(s.budsjett_nok) filter (where try_cast(s.period as integer) = try_cast(g.periode as integer) - 1), 0) as budsjett_forrige_nok,
    coalesce(sum(s.hovedbok_nok) filter (where s.period between substr(g.periode, 1, 4) || '01' and g.periode), 0) as hovedbok_hittil_nok,
    coalesce(sum(s.budsjett_nok) filter (where s.period between substr(g.periode, 1, 4) || '01' and g.periode), 0) as budsjett_hittil_nok
  from grid g left join scoped s on s.omfang = g.omfang and s.omfang_id = g.omfang_id
    and s.finansiering = g.finansiering and s.kategori = g.kategori
    and substr(s.period, 1, 4) = substr(g.periode, 1, 4)
  group by all
), totals as (
  select omfang, omfang_id, finansiering, 'Driftskostnader' as kategori, 4 as sortering, periode,
    sum(hovedbok_maaned_nok) as hovedbok_maaned_nok,
    sum(budsjett_maaned_nok) as budsjett_maaned_nok,
    sum(hovedbok_forrige_nok) as hovedbok_forrige_nok,
    sum(budsjett_forrige_nok) as budsjett_forrige_nok,
    sum(hovedbok_hittil_nok) as hovedbok_hittil_nok,
    sum(budsjett_hittil_nok) as budsjett_hittil_nok
  from measures group by omfang, omfang_id, finansiering, periode
), cash_base as (
  select trim(pay_period) as period, sum(try_cast(cash_amount as double)) as amount_nok
  from read_parquet('acatrans.parquet')
  where trim(dim_1) = '712' and trim(account) = '8720' and trim(dim_4) = '154370'
    and regexp_matches(trim(pay_period), '^20[0-9]{2}(0[1-9]|1[0-2])$')
  group by 1
), cash_rows as (
  select scope.omfang, scope.omfang_id, '154370' as finansiering, cat.kategori, cat.sortering, p.periode,
    case when cat.kategori = 'Lønnskostnader' then 0 else coalesce((select sum(amount_nok) from cash_base where period = p.periode), 0) end as hovedbok_maaned_nok,
    0::double as budsjett_maaned_nok,
    case when cat.kategori = 'Lønnskostnader' then 0 else coalesce((select sum(amount_nok) from cash_base where try_cast(period as integer) = try_cast(p.periode as integer) - 1), 0) end as hovedbok_forrige_nok,
    0::double as budsjett_forrige_nok,
    case when cat.kategori = 'Lønnskostnader' then 0 else coalesce((select sum(amount_nok) from cash_base where period between substr(p.periode, 1, 4) || '01' and p.periode), 0) end as hovedbok_hittil_nok,
    0::double as budsjett_hittil_nok
  from closed_periods p
  cross join (values ('Seksjon', '712'), ('Nkom', 'Nkom')) scope(omfang, omfang_id)
  cross join (values ('Lønnskostnader', 1), ('Tilskudd', 2), ('Driftskostnader', 4)) cat(kategori, sortering)
), report as (
  select * from measures union all select * from totals union all select * from cash_rows
)
select *, budsjett_maaned_nok - hovedbok_maaned_nok as avvik_maaned_nok,
  budsjett_forrige_nok - hovedbok_forrige_nok as avvik_forrige_nok,
  budsjett_hittil_nok - hovedbok_hittil_nok as avvik_hittil_nok,
  lpad(cast(try_cast(periode as integer) - 1 as varchar), 6, '0') as forrige_periode,
  substr(periode, 1, 4) || 'B' as budsjettversjon,
  'Beregnet lokalt fra operative Parquet-filer' as kildestatus
from report order by periode, omfang, omfang_id, finansiering, sortering
`;

const MONTHLY_INVOICES_SQL = `
with snapshot as (
  select max(coalesce(try_cast(action_date as timestamp), try_cast(ready_date as timestamp), try_cast(distr_date as timestamp))) as tid
  from read_parquet('awftaskfin.parquet')
), base as (
  select trim(col2_value) as fakturanr, oid, action_code, wf_status,
    trim(col1_value) as leverandor_navn, try_cast(col5_value as double) as belop_nok,
    trim(col6_value) as vist_konto, logged_values, try_cast(action_date as timestamp) as action_ts,
    coalesce(try_cast(action_date as timestamp), try_cast(ready_date as timestamp), try_cast(distr_date as timestamp)) as event_ts
  from read_parquet('awftaskfin.parquet')
  where col2_descr = 'Fakturanr' and trim(coalesce(col2_value, '')) <> ''
), flows as (
  select fakturanr, oid, arg_max(action_code, action_ts) as siste_handling,
    max(action_ts) as siste_handling_tid,
    arg_max(logged_values, action_ts) filter (where logged_values is not null) as dimensjoner,
    arg_max(leverandor_navn, event_ts) as leverandor_navn,
    arg_max(belop_nok, action_ts) filter (where logged_values is not null) as belop_nok,
    arg_max(vist_konto, action_ts) filter (where logged_values is not null) as vist_konto,
    count(*) filter (where wf_status = 'ACT') as aktive_oppgaver
  from base group by fakturanr, oid
), ledger as (
  select distinct trim(ext_inv_ref) as fakturanr from read_parquet('agltransact.parquet')
  where trim(coalesce(ext_inv_ref, '')) <> ''
)
select f.fakturanr, f.oid, f.leverandor_navn, f.belop_nok,
  coalesce(nullif(regexp_extract(f.dimensjoner, 'A0=([^;]+)', 1), ''), f.vist_konto) as konto,
  nullif(regexp_extract(f.dimensjoner, 'C1=([^;]+)', 1), '') as seksjon,
  nullif(regexp_extract(f.dimensjoner, 'B0=([^;]+)', 1), '') as prosjektnr,
  nullif(regexp_extract(f.dimensjoner, 'R00=([^;]+)', 1), '') as finansiering,
  case when date_diff('day', cast(f.siste_handling_tid as date), cast(snapshot.tid as date)) between 0 and 31 then 'Aktuell kandidat' else 'Historisk workflowpost' end as maanedsavslutningsstatus,
  case when date_diff('day', cast(f.siste_handling_tid as date), cast(snapshot.tid as date)) between 0 and 31
    then 'Ikke bokført i snapshot; har ACT-oppgave; siste fullførte handling er ' || f.siste_handling
    else 'Holdt utenfor arbeidslisten: siste registrerte handling er eldre enn 31 dager; ACT-statusen må bekreftes mot fakturasystemet' end as statusgrunnlag,
  f.siste_handling, f.siste_handling_tid, f.aktive_oppgaver,
  date_diff('day', cast(f.siste_handling_tid as date), cast(snapshot.tid as date)) as alder_dager,
  date_diff('day', cast(f.siste_handling_tid as date), cast(snapshot.tid as date)) between 0 and 31 as er_aktuell,
  'Ikke bokført i mottatt hovedbokssnapshot' as bokforingskontroll
from flows f cross join snapshot left join ledger l using (fakturanr)
where l.fakturanr is null and f.aktive_oppgaver > 0 and f.siste_handling in ('ATTEST', 'BDMGOD')
order by f.siste_handling_tid desc, f.fakturanr
`;

const WORKFLOW_SQL = `
with base as (
  select trim(col2_value) as fakturanr, oid, wf_status, wf_user_id, action_code,
    trim(col1_value) as leverandor_navn, trim(col8_value) as workflow_leverandor_id,
    trim(col3_value) as workflow_bilagsnr, try_cast(col5_value as double) as workflow_belop_nok,
    try_cast(action_date as timestamp) as action_ts,
    coalesce(try_cast(action_date as timestamp), try_cast(ready_date as timestamp), try_cast(distr_date as timestamp)) as event_ts
  from read_parquet('awftaskfin.parquet')
  where col2_descr = 'Fakturanr' and trim(coalesce(col2_value, '')) <> ''
), workflow as (
  select fakturanr, count(*) as workflow_rader, count(distinct oid) as workflow_flyter,
    count(distinct workflow_leverandor_id) as workflow_leverandor_id_antall,
    string_agg(distinct workflow_leverandor_id, ', ' order by workflow_leverandor_id) as workflow_leverandor_id,
    min(leverandor_navn) as leverandor_navn, max(workflow_belop_nok) as workflow_belop_maks_nok,
    count(distinct workflow_belop_nok) as workflow_belop_antall,
    string_agg(distinct workflow_bilagsnr, ', ' order by workflow_bilagsnr) as workflow_bilagsnr,
    count(*) filter (where wf_status = 'ACT') as aktive_oppgaver,
    count(distinct wf_user_id) filter (where wf_status = 'ACT') as aktive_brukere_antall,
    string_agg(distinct wf_user_id, ', ' order by wf_user_id) filter (where wf_status = 'ACT') as aktive_brukere,
    arg_max(wf_status, event_ts) as siste_oppgavestatus, max(event_ts) as siste_hendelse_tid
  from base group by fakturanr
), ledger as (
  select trim(ext_inv_ref) as fakturanr, count(*) as regnskapsrader,
    count(distinct trim(apar_id)) as regnskap_leverandorer,
    string_agg(distinct trim(apar_id), ', ' order by trim(apar_id)) as regnskap_leverandor_id,
    string_agg(distinct trim(voucher_no), ', ' order by trim(voucher_no)) as regnskap_bilagsnr,
    string_agg(distinct trim(period), ', ' order by trim(period)) as perioder,
    string_agg(distinct trim(dim_4), ', ' order by trim(dim_4)) as finansieringer,
    string_agg(distinct trim(account), ', ' order by trim(account)) as kontoer
  from read_parquet('agltransact.parquet') where trim(coalesce(ext_inv_ref, '')) <> '' group by 1
)
select w.*, case when workflow_belop_antall = 1 then workflow_belop_maks_nok end as workflow_belop_nok,
  case when aktive_oppgaver > 0 then 'Har aktive oppgaver' when siste_oppgavestatus = 'FIN' then 'Fullført'
    when siste_oppgavestatus = 'REJ' then 'Avvist' when siste_oppgavestatus = 'FWD' then 'Videresendt'
    when siste_oppgavestatus = 'TMD' then 'Tidsstyrt' else coalesce(siste_oppgavestatus, 'Ukjent') end as workflow_status,
  l.* exclude (fakturanr),
  case when l.fakturanr is null then 'Ikke matchet'
    when workflow_flyter = 1 and workflow_leverandor_id_antall = 1 and regnskap_leverandorer = 1 and workflow_leverandor_id = regnskap_leverandor_id then 'Sikker'
    when workflow_flyter = 1 and coalesce(regnskap_leverandorer, 0) <= 1 then 'Mulig' else 'Tvetydig' end as koblingskvalitet,
  case when l.fakturanr is null then 'Fakturanummeret mangler i mottatt hovedbokssnapshot'
    when workflow_flyter > 1 then 'Flere workflowflyter deler fakturanummer'
    when workflow_leverandor_id_antall > 1 then 'Flere workflowleverandører deler fakturanummer'
    when regnskap_leverandorer > 1 then 'Flere regnskapsleverandører deler fakturanummer'
    when workflow_leverandor_id <> regnskap_leverandor_id then 'Leverandør-id er ulik mellom workflow og regnskap'
    else 'Entydig fakturanummer og leverandør-id' end as koblingsaarsak
from workflow w left join ledger l using (fakturanr)
order by siste_hendelse_tid desc nulls last, fakturanr
`;

const EVENTS_SQL = `
select trim(col2_value) as fakturanr, oid, task_id, orig_task_id, node_id, task_group, wf_status,
  case wf_status when 'ACT' then 'Aktiv oppgave' when 'FIN' then 'Fullført/behandlet oppgave'
    when 'FWD' then 'Videresendt oppgave' when 'REJ' then 'Avvist oppgave'
    when 'TMD' then 'Tids-/ventestyrt, må bekreftes' when 'WTN' then 'Venter, må bekreftes'
    else 'Ukjent oppgavestatus' end as oppgavestatus_tekst,
  action_code,
  case when wf_status = 'ACT' and action_code is null then 'Ingen utført handling, oppgaven er aktiv'
    when action_code = 'ATTEST' then 'Attestrelatert handling fullført'
    when action_code = 'BDMGOD' then 'BDM-godkjenningsrelatert handling fullført'
    when action_code = 'FW' then 'Videresendt' when action_code is null then 'Ingen registrert handling'
    else 'Registrert handling (' || action_code || ')' end as handling_tekst,
  wf_user_id, real_user, orig_user,
  coalesce(try_cast(action_date as timestamp), try_cast(ready_date as timestamp), try_cast(distr_date as timestamp)) as hendelse_tid,
  wf_status = 'ACT' as er_aktiv
from read_parquet('awftaskfin.parquet')
where col2_descr = 'Fakturanr' and trim(coalesce(col2_value, '')) <> ''
order by fakturanr, oid, hendelse_tid, try_cast(task_id as integer)
`;

export const loadTask3Data = async (files) => {
  const db = await openLocalDuckDb(files, SOURCE_FILES);
  try {
    const [summary, invoices, sourceRows] = await Promise.all([
      db.query(SUMMARY_SQL), db.query(MONTHLY_INVOICES_SQL),
      db.query(`select max(coalesce(try_cast(action_date as timestamp), try_cast(ready_date as timestamp), try_cast(distr_date as timestamp))) as seneste_workflowhendelse, (select max(try_cast(voucher_date as date)) from read_parquet('agltransact.parquet')) as seneste_bilagsdato, (select max(trim(period)) from read_parquet('agltransact.parquet')) as seneste_hovedboksperiode from read_parquet('awftaskfin.parquet')`)
    ]);
    const current = invoices.filter((row) => row.er_aktuell === true).length;
    return {
      db, summary, invoices,
      metadata: [{ ...sourceRows[0], snapshot_status: 'Beregnet lokalt fra den valgte fellesmappen', workflow_kilde: 'awftaskfin.parquet', regnskap_kilde: 'agltransact.parquet' }],
      validations: [
        { kontroll: 'Faglig godkjenning av regnskapsregler', status: 'warning', antall: 1, detalj: 'Kontokategorier og finansieringsregler er foreløpige og må faglig godkjennes.' },
        { kontroll: 'Aktuelle kandidater til fakturakontroll', status: current ? 'warning' : 'ok', antall: current, detalj: 'Ikke bokført i hovedbokssnapshotet, har aktiv oppgave og siste handling er høyst 31 dager gammel.' }
      ],
      loadWorkflow: () => db.query(WORKFLOW_SQL),
      loadEvents: () => db.query(EVENTS_SQL)
    };
  } catch (error) {
    await db.close();
    throw error;
  }
};
