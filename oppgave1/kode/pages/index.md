---
title: KPI-dashboard
sidebar_position: 1
---

```sql section_options
select distinct
  section_code,
  section_label,
  section_sort
from dashboard_kpi_calculated
order by section_sort, section_label
```

```sql current_kpis
select *
from dashboard_kpi_calculated
where section_code = '${inputs.section_filter.value}'
  and end_period = case
    when '${inputs.period_filter.value}' = 'latest'
      then (select max(end_period) from dashboard_kpi_calculated)
    else '${inputs.period_filter.value}'
  end
```

```sql period_options
with periods as (
  select distinct end_period, period_label, period_sort
  from dashboard_kpi_calculated
), options as (
  select
    'latest' as period_value,
    'Siste tilgjengelige · ' || lower(arg_max(period_label, period_sort)) as period_option_label,
    0 as option_sort
  from periods

  union all

  select
    end_period as period_value,
    period_label as period_option_label,
    1000000 - period_sort as option_sort
  from periods
)
select * from options
order by option_sort
```

```sql fin154301_current
select * from ${current_kpis} where finansiering = '154301'
```

```sql fin154345_current
select * from ${current_kpis} where finansiering = '154345'
```

```sql fin154322_current
select * from ${current_kpis} where finansiering = '154322+045101'
```

```sql kpi_kildemetadata
select * from dashboard_kpi_source_metadata
```

<ExecutiveDashboard
  fin154301Data={fin154301_current}
  fin154345Data={fin154345_current}
  fin154322Data={fin154322_current}
  sourceMetadata={kpi_kildemetadata}
>
  <div slot="filters" class="evidence-filter-grid">
    <div class="cost-center-picker">
      <Dropdown
        data={section_options}
        name=section_filter
        value=section_code
        label=section_label
        order=section_sort
        title="Kostnadssted"
        description="Velg kostnadssted fra dimensjon C1 i regnskapet"
        defaultValue="all"
      />
    </div>
    <div class="period-picker">
      <Dropdown
        data={period_options}
        name=period_filter
        value=period_value
        label=period_option_label
        order=option_sort
        title="Rapportperiode"
        defaultValue="latest"
      />
    </div>
  </div>
</ExecutiveDashboard>
