# RFC 9457 — Problem Details for HTTP APIs

> **Source:** Nottingham, M. and Wilde, E. (2023). "Problem Details for HTTP APIs." IETF RFC 9457.
>
> **URL:** https://www.rfc-editor.org/rfc/rfc9457.html
>
> **Retrieved:** 2026-03-08

## Purpose

RFC 9457 defines a standardized machine-readable format for conveying error details in HTTP API responses: "to carry machine-readable details of errors in HTTP response content to avoid the need to define new error response formats for HTTP APIs."

## Why Machine-Readable Errors Matter

> "HTTP status codes cannot always convey enough information about errors to be helpful. While humans using web browsers can often understand an HTML response content, non-human consumers of HTTP APIs have difficulty doing so."

Automated systems and client libraries need structured, consistent error information beyond what status codes provide.

## The Problem Details JSON Object

The core format consists of these fields:

- **type**: URI identifying the problem type (defaults to `"about:blank"`)
- **status**: HTTP status code for this occurrence
- **title**: Short human-readable summary (should not vary per occurrence)
- **detail**: Human-readable explanation specific to this occurrence
- **instance**: URI identifying this specific problem occurrence

## Extension Members

Problem type definitions may add custom fields relevant to the error. For example, an "out-of-credit" problem might include account balance or payment account URIs.

## Key Insight

Status codes alone are insufficient for API error handling, particularly when clients need to determine appropriate corrective actions beyond generic HTTP semantics.
