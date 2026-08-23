---
title: Fakturastatus
sidebar_position: 5
full_width: true
sidebar: hide
hide_breadcrumbs: true
hide_toc: true
---

```sql workflow_fakturaer
select *
from workflow_invoice_status
order by siste_hendelse_tid desc nulls last, fakturanr
```

```sql workflow_hendelser
select *
from workflow_invoice_events
order by fakturanr, oid, hendelse_tid, try_cast(task_id as integer)
```

```sql workflow_kildestatus
select *
from workflow_source_metadata
```

```sql maanedsavslutning
select *
from monthly_close_summary
order by omfang, omfang_id, finansiering, sortering
```

```sql maanedsavslutning_fakturaer
select *
from monthly_close_invoices
order by siste_handling_tid desc
```

<Task3Header metadata={workflow_kildestatus} />

<MonthlyCloseReport
  summary={maanedsavslutning}
  invoices={maanedsavslutning_fakturaer}
/>

<WorkflowInvoiceReport
  rows={workflow_fakturaer}
  events={workflow_hendelser}
/>
