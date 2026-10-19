# QuickNotes Data Model

The initial data store is PostgreSQL. UUIDs identify records, and timestamps
are stored in UTC.

## Entities and relationships

- **users:** One user can own many notes and many tags.
- **notes:** Each note belongs to exactly one user.
- **tags:** Each tag belongs to exactly one user, so users can have independent
  tag names.
- **note_tags:** Join table connecting notes and tags. Notes and tags have a
  many-to-many relationship: a note can have many tags, and a tag can label
  many notes.

## CREATE TABLE statements

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);
```

## Indexes

```sql
CREATE INDEX notes_user_updated_idx
    ON notes (user_id, updated_at DESC);

CREATE INDEX note_tags_tag_id_idx
    ON note_tags (tag_id);
```

The notes index speeds up listing a user's notes in recently updated order.
The `note_tags` index supports finding notes associated with a tag.

## Example queries

List a user's newest notes:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT 20;
```

Create a note:

```sql
INSERT INTO notes (id, user_id, title, body)
VALUES ($1, $2, $3, $4)
RETURNING id, title, body, created_at, updated_at;
```

List notes with their tags (JOIN):

```sql
SELECT n.id, n.title, t.id AS tag_id, t.name AS tag_name
FROM notes AS n
LEFT JOIN note_tags AS nt ON nt.note_id = n.id
LEFT JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1
ORDER BY n.updated_at DESC;
```

Attach a tag to a note, ensuring both belong to the same user:

```sql
INSERT INTO note_tags (note_id, tag_id)
SELECT n.id, t.id
FROM notes AS n
JOIN tags AS t ON t.user_id = n.user_id
WHERE n.id = $1 AND t.id = $2 AND n.user_id = $3
ON CONFLICT DO NOTHING;
```

## SQL or NoSQL?

Use a relational SQL database such as PostgreSQL for the primary data store.
QuickNotes benefits from transactions, foreign keys, unique constraints, and
joins between users, notes, and tags. At this scale, indexes, caching, and
read replicas are reasonable first scaling steps; a NoSQL database would add
relationship-management and consistency trade-offs without a demonstrated
need.
