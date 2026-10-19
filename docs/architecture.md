# QuickNotes Architecture

## Requirements

### Functional requirements

- Users can register, authenticate, and manage their notes.
- Users can create, read, update, and delete notes.
- Users can list their notes and organize them with tags.
- The service validates requests and returns consistent error responses.

### Non-functional requirements

- Support approximately one million registered users.
- Keep common note-list requests responsive under normal and peak load.
- Preserve acknowledged writes and recover from component failures.
- Protect user data with authentication, authorization, backups, and encryption
  in transit.
- Monitor latency, traffic, errors, resource use, and cache effectiveness.

## Load estimate

Assumptions:

- 1,000,000 registered users.
- 20% use the service on a given day.
- Each daily active user creates 5 notes and loads notes 20 times per day.
- An average note, including metadata, is 500 bytes.
- Use 86,400 seconds per day and estimate peak load as 5× average.
- Storage excludes indexes, backups, replication, and future growth.

Daily active users:

```text
1,000,000 × 20% = 200,000 DAU
```

Writes:

```text
200,000 × 5 = 1,000,000 writes/day
1,000,000 ÷ 86,400 ≈ 11.6 writes/second average
11.6 × 5 ≈ 58 writes/second peak
```

Reads:

```text
200,000 × 20 = 4,000,000 reads/day
4,000,000 ÷ 86,400 ≈ 46.3 reads/second average
46.3 × 5 ≈ 232 reads/second peak
```

Storage:

```text
1,000,000 notes/day × 500 bytes = 500 MB/day
500 MB/day × 365 = 182,500 MB/year ≈ 183 GB/year
```

This is a read-heavy system: the estimate has four reads per write. Caching and
read replicas can reduce database read load, while writes go to the primary
database.

## Architecture diagram

```text
                         ┌──────────────┐
                         │     DNS      │
                         └──────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    v                       v
          ┌──────────────────┐     ┌──────────────────┐
          │ Client/browser   │────>│ CDN              │
          │ or mobile app    │     │ HTML/CSS/JS      │
          └────────┬─────────┘     └──────────────────┘
                   │ API requests
                   v
             ┌───────────────┐
             │ Load balancer │
             └───────┬───────┘
                     │
                ┌────┴────┐
                v         v
           ┌────────┐ ┌────────┐
           │ App 1  │ │ App 2  │
           └──┬──┬──┘ └──┬──┬──┘
              │  │       │  │
              │  └───────┴──┴──────>┌────────────┐
              │                      │ Cache      │
              │                      │ (Redis)    │
              │                      └────────────┘
              │ writes      reads
              v             v
        ┌─────────────┐  ┌─────────────┐
        │ Primary DB  │─>│ Read replica│
        └──────┬──────┘  └─────────────┘
               │
               │ background jobs
               v
        ┌─────────────┐     ┌─────────────┐
        │ Job queue   │────>│ Worker      │
        └─────────────┘     └─────────────┘
```

## Components

- **Client:** Displays the application and sends HTTPS requests to the API.
- **DNS:** Resolves the service hostname so clients can reach the CDN and API.
- **CDN:** Serves static front-end assets close to users, reducing latency and
  origin traffic.
- **Load balancer:** Distributes API requests across healthy app servers and
  stops routing to unhealthy instances.
- **App servers:** Run stateless API logic so any healthy instance can handle
  any request.
- **Cache:** Stores frequently read note lists in memory to reduce database
  load and response time.
- **Primary database:** Stores authoritative data and accepts writes.
- **Read replica:** Serves eligible read queries to increase read capacity;
  replication lag can briefly make it stale.
- **Job queue:** Buffers slow or retryable work so it does not delay the
  user-facing response.
- **Worker:** Processes queued background jobs independently of API requests.

## GET /notes flow

1. The client sends `GET /v1/notes` through the load balancer.
2. The load balancer selects a healthy app server.
3. The app server authenticates the user and checks the cache for that user's
   note list.
4. On a cache hit, the app returns the cached result.
5. On a cache miss, the app reads from the read replica, caches the result with
   a time-to-live, and returns it.
6. If a replica is unavailable, the service can fall back to the primary under
   a controlled policy. Read-after-write requests can go to the primary.

## POST /notes flow

1. The client sends `POST /v1/notes` with a JSON body through the load balancer.
2. The app server authenticates the user and validates the title and body.
3. The app writes the note to the primary database and waits for confirmation.
4. The app invalidates the user's cached note list so the next read can fetch
   fresh data.
5. The app returns `201 Created` with the saved note.
6. If extra work is required, the app adds a job to the queue for a worker to
   process asynchronously.

## Trade-offs and single points of failure

- **Cache speed vs. freshness:** Caching reduces latency and database load,
  but cached data can be stale; invalidate it on writes and use a TTL as a
  safety net.
- **Read capacity vs. consistency:** Read replicas increase read capacity, but
  replication lag can temporarily hide a recent write; route read-after-write
  requests to the primary when needed.
- **Simplicity vs. availability:** A single server is easier to operate, but
  multiple app servers and health checks improve availability at the cost of
  operational complexity.
- **Cost vs. reliability:** Redundant instances, replicas, and tested backups
  improve recovery but increase infrastructure costs.

Avoid a single app-server failure taking down the service by running at least
two stateless app servers behind a health-checking load balancer. Protect the
database with automated backups and a tested replica-promotion procedure; a
replica is not a substitute for an independent backup. Deploy critical
infrastructure redundantly and monitor it so failures are detected promptly.
