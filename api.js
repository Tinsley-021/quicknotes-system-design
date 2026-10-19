"use strict";

const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const statusElement = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");
const notesList = document.querySelector("#notes-list");

// JSONPlaceholder simulates POST and DELETE responses but does not persist
// those changes. Keep a local in-memory list so changes are visible this session.
let notes = [];

function setStatus(message, kind = "") {
  statusElement.textContent = message;
  statusElement.className = kind;
}

/**
 * Fetch JSON and reject unsuccessful HTTP responses.
 * A 204 response has no body, which is normal for a successful DELETE.
 */
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}.`);
  }

  if (response.status === 204) {
    return { data: null, status: response.status };
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
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
    body.textContent = note.body || "";

    const meta = document.createElement("p");
    meta.className = "note-meta";
    meta.textContent = `Note ID: ${note.id}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteNote(note.id, deleteButton));

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

    notes = data;
    renderNotes();

    if (notes.length === 0) {
      setStatus("No notes were found.", "success");
    } else {
      setStatus(`Loaded ${notes.length} notes from the server.`, "success");
    }
  } catch (error) {
    setStatus(`Could not load notes. Please try again. ${error.message}`, "error");
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

  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus("Creating note...");

  try {
    const { data, status } = await request(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({
        title,
        body,
        userId: 1
      })
    });

    if (!data || data.id === undefined) {
      throw new Error("The server did not return the created note.");
    }

    notes.unshift(data);
    renderNotes();
    noteForm.reset();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
  } catch (error) {
    setStatus(`Could not create the note. Please try again. ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteNote(id, button) {
  button.disabled = true;
  setStatus("Deleting note...");

  try {
    const { status } = await request(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    notes = notes.filter((note) => String(note.id) !== String(id));
    renderNotes();
    setStatus(`Note deleted (status ${status}, id ${id}).`, "success");
  } catch (error) {
    button.disabled = false;
    setStatus(`Could not delete the note. Please try again. ${error.message}`, "error");
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

renderNotes();
