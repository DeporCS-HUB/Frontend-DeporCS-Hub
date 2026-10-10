# Program workspace

The dashboard replaces generic finance/asset KPI cards with program progress, upcoming milestones, open follow-up tasks and Staff contributions. Proker/UKOR tabs show recorded PJ names, status, optional percentage, notes and the next milestone. The original Depor palette and responsive navigation remain. Dashboard no longer loads the chart library; finance charts remain split into their own route.

On Programs, BPH can edit full records and select multiple account-linked PJ profiles. Assigned Staff and BPH see Update progres, with only status, percentage and notes. Permissions use account UUIDs, not display-name matching; API/RLS enforce the same restriction. Dates/budget/percentage can remain unknown. Completed status sets percentage to 100 on save. A failed save retains confirmed data and shows the error. Successful saves invalidate the existing GET cache, refreshing dashboard and lists.

Staff contribution rows show responsibilities, completed/assigned tasks, review and overdue counts, genuine updates in 30 days and last update time. No tasks means Belum ada tugas, rather than a zero-percent score. Activities have shared PJ responsibilities; unassigned tasks do not count against individual Staff. Initial data import does not pretend that Staff submitted updates.

Build, lint and 22 unit tests pass. The browser suite now contains 15 mocked-API flows, including assigned Staff editing/reload/failure retention and BPH saving multiple PJs while preserving unknown dates/progress. These checks do not certify live Supabase Auth, cookie behavior or authenticated hosted acceptance. Apply the backend workspace migration and deploy the backend before this frontend release. No new dependency or paid service is required.
