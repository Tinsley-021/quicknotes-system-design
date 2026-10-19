# QuickNotes API Design

This document describes the production QuickNotes API, not the JSONPlaceholder
practice API used by the browser client.

## Conventions

- Base URL: `https://api.quicknotes.example/v1`
- Requests and responses use JSON unless the response is `204 No Content`.
- Authenticated endpoints require `Authorization: Bearer <access-token>`.
- Users can access only their own notes and tags.
- IDs are UUIDs and timestamps are UTC ISO 8601 strings.
- List endpoints use cursor pagination. Default limit: 20; maximum: 100.

## Endpoints

| Method | Path | Description | Success |
|---|---|---|---:|
| POST | `/auth/register` | Create a user account | 201 |
| POST | `/auth/login` | Authenticate and return tokens | 200 |
| POST | `/auth/logout` | Revoke the current refresh token | 204 |
| GET | `/users/me` | Get the authenticated user's profile | 200 |
| GET | `/notes` | List the user's notes; supports `limit` and `cursor` | 200 |
| POST | `/notes` | Create a note | 201 |
| GET | `/notes/{noteId}` | Get one of the user's notes | 200 |
| PATCH | `/notes/{noteId}` | Update a note's title or body | 200 |
| DELETE | `/notes/{noteId}` | Delete a note | 204 |
| GET | `/tags` | List the user's tags | 200 |
| PUT | `/notes/{noteId}/tags/{tagId}` | Attach a tag to a note | 204 |
| DELETE | `/notes/{noteId}/tags/{tagId}` | Remove a tag from a note | 204 |

## Create a note

`POST /v1/notes`

Request:

```json
{
  "title": "Meeting notes",
  "body": "Follow up with the design team.",
  "tagIds": ["8fd7e0a8-49f3-49f8-9d43-8f1e4ca3f010"]
}
```

Response: `201 Created`

```json
{
  "data": {
    "id": "6ad6a73d-cc6e-4d90-9bcb-5d7bdcae4c39",
    "userId": "a8a4c7b0-d5b7-4af1-aee0-c3229199ee27",
    "title": "Meeting notes",
    "body": "Follow up with the design team.",
    "tags": [
      {
        "id": "8fd7e0a8-49f3-49f8-9d43-8f1e4ca3f010",
        "name": "work"
      }
    ],
    "createdAt": "2026-10-19T12:00:00Z",
    "updatedAt": "2026-10-19T12:00:00Z"
  }
}
```

## List notes

`GET /v1/notes?limit=20&cursor=eyJpZCI6IjEwMCJ9`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": "6ad6a73d-cc6e-4d90-9bcb-5d7bdcae4c39",
      "userId": "a8a4c7b0-d5b7-4af1-aee0-c3229199ee27",
      "title": "Meeting notes",
      "body": "Follow up with the design team.",
      "tags": [
        {
          "id": "8fd7e0a8-49f3-49f8-9d43-8f1e4ca3f010",
          "name": "work"
        }
      ],
      "createdAt": "2026-10-19T12:00:00Z",
      "updatedAt": "2026-10-19T12:00:00Z"
    }
  ],
  "page": {
    "limit": 20,
    "nextCursor": null
  }
}
```

Notes are returned newest first. Cursors are opaque; clients pass the
`nextCursor` value back without interpreting it.

## Error responses

All errors use this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 1–100 characters.",
    "requestId": "req_01JABCDEF123"
  }
}
```

| Status | Code example | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Invalid JSON, fields, or pagination parameters |
| 401 | `UNAUTHENTICATED` | Missing, expired, or invalid access token |
| 403 | `FORBIDDEN` | Authenticated user is not permitted to perform the action |
| 404 | `NOT_FOUND` | Requested note or tag does not exist for this user |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Example `400 Bad Request`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 1–100 characters.",
    "requestId": "req_01JABCDEF123"
  }
}
```

Example `401 Unauthorized`:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "A valid access token is required.",
    "requestId": "req_01JABCDEF124"
  }
}
```

Example `403 Forbidden`:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource.",
    "requestId": "req_01JABCDEF125"
  }
}
```

Example `404 Not Found`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested note was not found.",
    "requestId": "req_01JABCDEF126"
  }
}
```

Example `500 Internal Server Error`:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred.",
    "requestId": "req_01JABCDEF127"
  }
}
```
