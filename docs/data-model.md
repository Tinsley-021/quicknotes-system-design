# QuickNotes Data Model

QuickNotes uses PostgreSQL. Users, notes, and tags have clear relationships,
and relational constraints help enforce ownership and data integrity.

## Entities and relationships

- **users**: account owners.
- **notes**: each note belongs to one user; one user can own many notes
  (one-to-many).
- **tags**: labels owned by a user.
- **note_tags**: joins notes and tags; notes and tags have a many-to-many
  relationship.

## Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

The composite primary key on `note_tags` prevents the same tag from being
attached to the same note twice.

## Example queries

List a user's notes, newest first:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT 20;
```

Find a user's notes with a particular tag (JOIN):

```sql
SELECT n.id, n.title, n.body
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1
  AND t.name = $2
ORDER BY n.updated_at DESC;
```

Count notes for a user:

```sql
SELECT COUNT(*) AS note_count
FROM notes
WHERE user_id = $1;
```

List tags attached to a note:

```sql
SELECT t.id, t.name
FROM tags AS t
JOIN note_tags AS nt ON nt.tag_id = t.id
WHERE nt.note_id = $1
ORDER BY t.name;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_updated
ON notes (user_id, updated_at DESC);
```

The main list query filters by `user_id` and sorts by `updated_at`, so this
index helps retrieve a user's newest notes without scanning and sorting every
note. Primary keys and unique constraints also create indexes.

## SQL versus NoSQL

SQL is a good fit because the data has stable relationships, ownership rules,
and integrity requirements. PostgreSQL enforces foreign keys and uniqueness,
and joins make tag queries straightforward. NoSQL could be reconsidered if
the product later needs highly variable note structures or a distribution
model that makes relational storage unsuitable.
