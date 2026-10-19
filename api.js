"use strict";

const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

const loadButton = document.querySelector("#load-btn");
const statusElement = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");
const notesList = document.querySelector("#notes-list");

// JSONPlaceholder simulates POST and DELETE but does not persist changes.
// Locally created notes are tracked in memory and removed locally on delete.
let notes = [];

function setStatus(message, kind = "") {
  statusElement.textContent = message;
  statusElement.className = kind;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}.`);
  }

  if (response.status === 204) {
    return { data: null, status: response.status };
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("The server returned an invalid response.");
    }
  }

  return { data, status: response.status };
}

function renderNotes() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty";
    emptyItem.textContent = "No notes to show. Load notes or create one.";
    notesList.append(emptyItem);
    return;
  }

  for (const note of notes) {
    const item = document.createElement("li");
    item.className = "note";

    const title = document.createElement("h3");
    title.textContent = note.title || "(Untitled)";

    const body = document.createElement("p");
    body.className = "note-body";
    body.textContent = note.body || "(No body)";

    const meta = document.createElement("p");
    meta.className = "note-meta";
    meta.textContent = `Note ID: ${note.id}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteNote(note, deleteButton));

    item.append(title, body, meta, deleteButton);
    notesList.append(item);
  }
}

async function loadNotes() {
  loadButton.disabled = true;
  setStatus("Loading notes...");

  try {
    const { data } = await request(`${API_URL}?_limit=10`);

    if (!Array.isArray(data)) {
      throw new Error("The server returned an unexpected notes list.");
    }

    notes = data.map((note) => ({ ...note, isLocal: false }));
    renderNotes();

    if (notes.length === 0) {
      setStatus("No notes were found.", "success");
    } else {
      setStatus(`Loaded ${notes.length} notes from the server.`, "success");
    }
  } catch {
    setStatus("Could not load notes. Please check your connection and try again.", "error");
  } finally {
    loadButton.disabled = false;
  }
}

async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    setStatus("Please enter a title.", "error");
    titleInput.focus();
    return;
  }

  if (title.length > MAX_TITLE_LENGTH) {
    setStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus("Creating note...");

  try {
    const { data, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title, body, userId: 1 })
    });

    if (!data || data.id === undefined) {
      throw new Error("The server did not return the created note.");
    }

    // The practice API may return the same simulated ID for multiple POSTs.
    // A unique local key lets each created note be removed correctly.
    const createdNote = {
      ...data,
      localKey: crypto.randomUUID(),
      isLocal: true
    };

    notes.unshift(createdNote);
    renderNotes();
    noteForm.reset();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
  } catch {
    setStatus("Could not create the note. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteNote(note, button) {
  button.disabled = true;
  setStatus("Deleting note...");

  try {
    if (!note.isLocal) {
      const { status } = await request(
        `${API_URL}/${encodeURIComponent(note.id)}`,
        { method: "DELETE" }
      );
      setStatus(`Note deleted (status ${status}, id ${note.id}).`, "success");
    } else {
      // This simulated POST was never persisted, so remove it from local state.
      setStatus(`Note deleted locally (simulated id ${note.id}).`, "success");
    }

    notes = notes.filter((item) =>
      note.isLocal
        ? item.localKey !== note.localKey
        : !(item.id === note.id && !item.isLocal)
    );

    renderNotes();
  } catch {
    button.disabled = false;
    setStatus("Could not delete the note. Please try again.", "error");
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

renderNotes();
