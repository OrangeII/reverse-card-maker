class AnkiConnect {
  constructor(url = "http://localhost:8765") {
    this.url = url;
    this.version = 6;
  }

  async ankiConnectRequest(action, params = {}) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, version: this.version, params }),
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.result;
  }

  getDeckNames() {
    return this.ankiConnectRequest("deckNames");
  }

  getModelNames() {
    return this.ankiConnectRequest("modelNames");
  }

  getModelFieldNames(modelName) {
    return this.ankiConnectRequest("modelFieldNames", { modelName });
  }

  findCards(query) {
    return this.ankiConnectRequest("findCards", { query });
  }

  notesInfo(noteIds) {
    return this.ankiConnectRequest("notesInfo", { notes: noteIds });
  }

  addNote(note) {
    return this.ankiConnectRequest("addNote", { note });
  }
}
