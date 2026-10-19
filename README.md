# QuickNotes System Design

This repository contains a browser API client and system design documents
for a QuickNotes service designed for growth to one million users.

## Run the API client

Clone the repository and open `index.html` in a browser. For local development,
open the project folder in VS Code and use the Live Server extension.

The client uses JSONPlaceholder as a practice API to load, create, and delete
posts. JSONPlaceholder simulates create and delete operations but does not
persist those changes. The client handles this limitation in `api.js`.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How to use `fetch`, async/await, HTTP methods, and status codes in a client.
- How to validate input and display loading, success, error, and empty states.
- How relational tables, foreign keys, indexes, and joins model application data.
- How caches, replicas, queues, and redundant services support a growing system.
- How to document system trade-offs and failure handling.
