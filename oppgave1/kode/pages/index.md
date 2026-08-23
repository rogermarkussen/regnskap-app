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
  and period_key = '${inputs.period_filter}'
```

```sql period_options
select * from (
  values
    ('p1_3', 'Jan–mar', 1),
    ('p1_4', 'Jan–apr', 2),
    ('p1_6', 'Jan–jun', 3)
) as periods(period_key, period_label, period_sort)
order by period_sort
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
    <Dropdown
      data={section_options}
      name=section_filter
      value=section_code
      label=section_label
      order=section_sort
      title="Seksjon"
      description="Organisatorisk seksjon frå dimensjon C1 i rekneskapen"
      defaultValue="all"
    />
    <ButtonGroup
      data={period_options}
      name=period_filter
      value=period_key
      label=period_label
      order=period_sort
      title="Rapportperiode"
      defaultValue="p1_3"
    />
  </div>
</ExecutiveDashboard>
