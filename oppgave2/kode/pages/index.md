---
title: Kontogruppering
sidebar_position: 2
full_width: true
sidebar: hide
hide_breadcrumbs: true
hide_toc: true
---

```sql kontogruppering_data
select *
from grouped_finance_rows
order by finansiering, rapportperiode, excel_row
```

<KontogrupperingReport rows={kontogruppering_data} />
