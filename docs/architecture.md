# QuickNotes Architecture

## Requirements

### Functional

- Users can register, log in, and manage their sessions.
- Users can create, read, update, delete, search, and tag notes.
- Notes are private to their owner and sync across the user's devices.
- Users can access the service from a browser or mobile client.

### Non-functional

- Target 99.9% service availability.
- Most note-list requests should complete within 300 ms.
- Protect accounts and notes with authentication, authorization, and TLS.
- Back up data and support database failover.
- Scale application capacity horizontally as traffic grows.

## Load estimate

Assumptions: 1,000,000 registered users; 20% daily active users; each active
user loads notes 20 times and creates 5 notes per day.

- Daily active users: 1,000,000 × 20% = 200,000.
- Reads: 200,000 × 20 = 4,000,000/day, about **46 reads/second average**.
- Writes: 200,000 × 5 = 1,000,000/day, about **12 writes/second average**.
- Plan for roughly 5× peak traffic: about **230 reads/second** and
  **60 writes/second**.
- Storage: assume 1,000,000 notes/day × 1 KB per stored note including
  indexes and metadata = about 1 GB/day, or **365 GB/year**, before replicas
  and backups.

These estimates are planning assumptions and should be revised using
production measurements.

## Architecture diagram

```text
                   ┌─────────────────────┐
                   │ Browser / mobile app│
                   └──────────┬──────────┘
                              │
                    DNS: api.quicknotes.com
                              │
                    ┌─────────▼─────────┐
                    │ CDN (static assets)│
                    └─────────┬─────────┘
                              │ HTTPS API requests
                    ┌─────────▼─────────┐
                    │ Load balancer pair│
                    └──────┬───────┬────┘
                           │       │
                  ┌────────▼─┐   ┌─▼────────┐
                  │App server│   │App server│
                  │    1     │   │    2     │
                  └─────┬────┘   └────┬─────┘
                        └──────┬──────┘
                               │
                     ┌─────────▼─────────┐
                     │ Cache (Redis HA)  │
                     └─────────┬─────────┘
                               │
                  ┌────────────▼────────────┐
                  │ Primary database        │
                  │       PostgreSQL        │
                  └────────────┬────────────┘
                               │ replication
                  ┌────────────▼────────────┐
                  │ PostgreSQL read replica │
                  └─────────────────────────┘

         App servers ──> Queue ──> Worker ──> Email / export jobs
         Primary DB ──> Backups in separate object storage
```

## Components

| Component | Problem it solves |
|---|---|
| DNS | Resolves the API hostname to the service's network address. |
| CDN | Serves static files near users and reduces origin traffic. |
| Load balancer pair | Distributes API requests and routes around unhealthy app servers. |
| App servers | Run API logic and scale horizontally as request volume grows. |
| Redis cache | Speeds up frequently requested note lists and reduces database reads. |
| Primary database | Provides the authoritative source for writes and transactions. |
| Read replica | Serves read traffic and can support database failover. |
| Queue | Holds slow or retryable work outside the user's request path. |
| Worker | Processes queued email, export, and other background jobs. |
| Backups | Allow recovery from data loss, operator mistakes, or corruption. |

## Request flows

### `GET /v1/notes`

1. The client sends an HTTPS request with its access token.
2. DNS resolves the API hostname; the load balancer selects a healthy app server.
3. The app server validates the token and determines the authenticated user ID.
4. The app checks the cache using a user-scoped key such as
   `notes:<user-id>:<cursor>`.
5. On a cache hit, the app returns the cached page with `200 OK`.
6. On a cache miss, the app queries the read replica, caches the result with a
   short TTL, and returns `200 OK`.
7. The app never uses a client-supplied user ID to authorize access.

### `POST /v1/notes`

1. The client sends an HTTPS request with its access token and JSON note data.
2. The load balancer forwards the request to a healthy app server.
3. The app validates the token and request fields; invalid fields return
   `400 Bad Request`.
4. The app inserts the note into the primary database in a transaction.
5. The app invalidates the user's note-list cache entries.
6. The app returns the created note with `201 Created`.
7. Nonessential work, such as notifications, is placed on the queue for a worker.

## Trade-offs

1. **Cache speed versus freshness:** cached lists can briefly be stale. Use
   short TTLs and invalidate a user's note-list keys after writes; return the
   newly created note directly in the POST response.
2. **Read replicas versus consistency:** replicas reduce primary read load but
   may lag. Route writes and read-after-write requests to the primary when
   immediate consistency is required.
3. **One database versus sharding:** a single PostgreSQL primary with a replica
   is simpler to operate at this estimated scale. Sharding may be needed if
   measured capacity or storage growth exceeds what a database cluster can
   handle economically.
4. **Redundancy versus cost:** multiple app servers, load balancers, and a
   replica cost more than a single-server design but reduce downtime risk.

## Avoiding single points of failure

- Run the load balancer across redundant instances or zones with health checks.
- Use at least two stateless app servers across separate availability zones.
- Configure database replication and documented automated or operator-led
  promotion of the replica.
- Run Redis in a highly available configuration; if it is unavailable, bypass
  the cache and read from the database.
- Store backups in separate object storage and regularly test restoration.
- Make queue consumers retry safely and monitor queue depth and failed jobs.
