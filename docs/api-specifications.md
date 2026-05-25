# API Specifications

This page defines the documentation conventions for Darion API reference
material. Keep endpoint details specific, stable, and easy to compare.

## Response Envelope

Use a consistent response envelope for examples unless a service contract
requires otherwise.

```json
{
  "data": {
    "id": "doc_01",
    "type": "documentationEntry"
  },
  "meta": {
    "requestId": "req_local_example",
    "version": "2026-05-25"
  }
}
```

## Reference Table Pattern

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | object | Yes | Contains the primary response payload. |
| `meta` | object | Yes | Contains request metadata and version information. |
| `errors` | array | No | Contains recoverable or blocking error details. |

