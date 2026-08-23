---
title: KPI-dashboard
sidebar_position: 1
---

```sql fin154301_period_all
select *
from dashboard_kpi_calculated
where finansiering = '154301'
```

```sql fin154322_period_all
select *
from dashboard_kpi_calculated
where finansiering = '154322+045101'
```

```sql fin154345_period_all
select *
from dashboard_kpi_calculated
where finansiering = '154345'
```

```sql kpi_kildemetadata
select *
from dashboard_kpi_source_metadata
```

```sql fin154301_period_p13
select * from ${fin154301_period_all} where period_key = 'p1_3'
```

```sql fin154301_period_p14
select * from ${fin154301_period_all} where period_key = 'p1_4'
```

```sql fin154301_period_p16
select * from ${fin154301_period_all} where period_key = 'p1_6'
```

```sql fin154322_period_p13
select * from ${fin154322_period_all} where period_key = 'p1_3'
```

```sql fin154322_period_p14
select * from ${fin154322_period_all} where period_key = 'p1_4'
```

```sql fin154322_period_p16
select * from ${fin154322_period_all} where period_key = 'p1_6'
```

```sql fin154345_period_p13
select * from ${fin154345_period_all} where period_key = 'p1_3'
```

```sql fin154345_period_p14
select * from ${fin154345_period_all} where period_key = 'p1_4'
```

```sql fin154345_period_p16
select * from ${fin154345_period_all} where period_key = 'p1_6'
```

<ExecutiveDashboard
  fin154301Data={fin154301_period_p13}
  fin154301PeriodP13={fin154301_period_p13}
  fin154301PeriodP14={fin154301_period_p14}
  fin154301PeriodP16={fin154301_period_p16}
  fin154322Data={fin154322_period_p13}
  fin154322PeriodP13={fin154322_period_p13}
  fin154322PeriodP14={fin154322_period_p14}
  fin154322PeriodP16={fin154322_period_p16}
  fin154345Data={fin154345_period_p13}
  fin154345PeriodP13={fin154345_period_p13}
  fin154345PeriodP14={fin154345_period_p14}
  fin154345PeriodP16={fin154345_period_p16}
  sourceMetadata={kpi_kildemetadata}
/>
