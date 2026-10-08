# UC02 Partial Upload (S3/R-05)

First Sync can ack the report while photo stays PENDING with the same
`photoAttachId`. Retry syncs the photo only — never a second reportId.

