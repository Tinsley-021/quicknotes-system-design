# QuickNotes API Design

This document describes the production QuickNotes API, not JSONPlaceholder.

## Conventions

- Base URL: `https://api.quicknotes.example/v1`
- Requests and responses use JSON.
- Authenticated routes require `Authorization: Bearer <access-token>`.
- IDs are UUIDs.
- Timestamps are UTC ISO 8601 strings.
- List endpoints use cursor pagination; the default page size is 20 and the
  maximum is 100.

## Endpoint table

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/auth/register` | Create a user account | 201 Created |
| POST | `/auth/login` | Authenticate and issue tokens | 200 OK |
| POST | `/auth/logout` | Revoke the current refresh token | 204 No Content |
| GET | `/users/me` | Return the authenticated user's profile | 200 OK |
| GET | `/notes` | List the user's notes; supports `limit` and `cursor` | 200 OK |
| POST | `/notes` | Create a note | 201 Created |
| GET | `/notes/{noteId}` | Get one note owned by the user | 200 OK |
| PATCH | `/notes/{noteId}` | Update selected note fields | 200 OK |
| DELETE | `/notes/{noteId}` | Delete a note owned by the user | 204 No Content |
| GET | `/tags` | List the user's tags | 200 OK |
| PUT | `/notes/{noteId}/tags/{tagId}` | Attach an existing tag to a note | 204 No Content |
| DELETE | `/notes/{noteId}/tags/{tagId}` | Remove a tag from a note | 204 No Content |

## Create a note

Request:

```http
POST /v1/notes
Authorization: Bearer <access-token>
Content-Type: application/json
