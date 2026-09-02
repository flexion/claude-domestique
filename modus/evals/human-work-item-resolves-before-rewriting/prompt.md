Here is a ticket from our backlog. Help me tighten up the wording and write
acceptance criteria for it.

Title: Improve the export

Description:
Users have complained that the CSV export is slow and hard to use. We should add
a background job so the export happens asynchronously and the user gets an email
when it is ready. The export must complete within 5 seconds so the user is not
left waiting on the page. Add a caching layer in Redis keyed on the filter set.
Only admins should be able to export. Everyone who can see the report should be
able to export it.
