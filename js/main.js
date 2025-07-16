document.addEventListener("DOMContentLoaded", () => {
  const anki = new AnkiConnect();

  const sourceDeckSelect = document.getElementById("source-deck");
  const destDeckSelect = document.getElementById("dest-deck");
  const sourceModelSelect = document.getElementById("source-model");
  const destModelSelect = document.getElementById("dest-model");
  const numCardsInput = document.getElementById("num-cards");
  const fieldMappingSection = document.getElementById("field-mapping-section");
  const fieldMappingUi = document.getElementById("field-mapping-ui");
  const generateCardsButton = document.getElementById("generate-cards");
  const logOutput = document.getElementById("log-output");

  function log(message) {
    logOutput.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  async function populateDecks() {
    try {
      const deckNames = await anki.getDeckNames();
      sourceDeckSelect.innerHTML = "";
      destDeckSelect.innerHTML = "";
      deckNames.forEach((name) => {
        const option1 = document.createElement("option");
        option1.value = name;
        option1.textContent = name;
        sourceDeckSelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = name;
        option2.textContent = name;
        destDeckSelect.appendChild(option2);
      });
      log("Decks loaded.");
    } catch (e) {
      log(`Error loading decks: ${e.message}`);
    }
  }

  async function populateModels() {
    try {
      const modelNames = await anki.getModelNames();
      sourceModelSelect.innerHTML = "";
      destModelSelect.innerHTML = "";
      modelNames.forEach((name) => {
        const option1 = document.createElement("option");
        option1.value = name;
        option1.textContent = name;
        sourceModelSelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = name;
        option2.textContent = name;
        destModelSelect.appendChild(option2);
      });
      log("Card types loaded.");
      updateFieldMapping();
    } catch (e) {
      log(`Error loading card types: ${e.message}`);
    }
  }

  async function updateFieldMapping() {
    const sourceModel = sourceModelSelect.value;
    const destModel = destModelSelect.value;

    if (!sourceModel || !destModel) {
      fieldMappingSection.style.display = "none";
      return;
    }

    try {
      const sourceFields = await anki.getModelFieldNames(sourceModel);
      const destFields = await anki.getModelFieldNames(destModel);

      fieldMappingUi.innerHTML = "";

      destFields.forEach((destField) => {
        const formGroup = document.createElement("div");
        formGroup.className = "form-group";

        const label = document.createElement("label");
        label.textContent = `Destination Field: "${destField}"`;
        formGroup.appendChild(label);

        const select = document.createElement("select");
        select.dataset.destField = destField;

        const noneOption = document.createElement("option");
        noneOption.value = "";
        noneOption.textContent = "--- Do not map ---";
        select.appendChild(noneOption);

        sourceFields.forEach((sourceField) => {
          const option = document.createElement("option");
          option.value = sourceField;
          option.textContent = `Source Field: "${sourceField}"`;
          if (sourceField === destField) {
            option.selected = true;
          }
          select.appendChild(option);
        });

        formGroup.appendChild(select);
        fieldMappingUi.appendChild(formGroup);
      });

      fieldMappingSection.style.display = "block";
      log("Field mapping UI updated.");
    } catch (e) {
      log(`Error updating field mapping: ${e.message}`);
      fieldMappingSection.style.display = "none";
    }
  }

  async function generateCards() {
    log("Starting card generation...");
    generateCardsButton.disabled = true;

    try {
      const sourceDeck = sourceDeckSelect.value;
      const destDeck = destDeckSelect.value;
      const sourceModel = sourceModelSelect.value;
      const destModel = destModelSelect.value;
      const numCards = parseInt(numCardsInput.value, 10);

      if (
        !sourceDeck ||
        !destDeck ||
        !sourceModel ||
        !destModel ||
        !numCards > 0
      ) {
        log("Please fill in all settings.");
        return;
      }

      log(`Finding cards in deck "${sourceDeck}" of type "${sourceModel}"...`);
      const query = `deck:"${sourceDeck}" note:"${sourceModel}"`;
      const cardIds = await anki.findCards(query);
      log(`Found ${cardIds.length} potential source cards.`);

      if (cardIds.length === 0) {
        log("No matching cards found.");
        return;
      }

      const notesInfo = await anki.notesInfo(cardIds);
      const notesToProcess = notesInfo.slice(0, numCards);
      log(`Processing ${notesToProcess.length} cards.`);

      const fieldMappings = {};
      fieldMappingUi.querySelectorAll("select").forEach((select) => {
        if (select.value) {
          fieldMappings[select.dataset.destField] = select.value;
        }
      });

      if (Object.keys(fieldMappings).length === 0) {
        log("No field mappings configured. Aborting.");
        return;
      }

      let createdCount = 0;
      for (const sourceNote of notesToProcess) {
        const newNote = {
          deckName: destDeck,
          modelName: destModel,
          fields: {},
          tags: sourceNote.tags,
        };

        for (const [destField, sourceField] of Object.entries(fieldMappings)) {
          if (sourceNote.fields[sourceField]) {
            newNote.fields[destField] = sourceNote.fields[sourceField].value;
          }
        }

        try {
          await anki.addNote(newNote);
          log(`Created new card from source note ID ${sourceNote.noteId}`);
          createdCount++;
        } catch (e) {
          log(
            `Error creating card for source note ID ${sourceNote.noteId}: ${e.message}`
          );
        }
      }
      log(`Finished. Successfully created ${createdCount} cards.`);
    } catch (e) {
      log(`An error occurred: ${e.message}`);
    } finally {
      generateCardsButton.disabled = false;
    }
  }

  sourceModelSelect.addEventListener("change", updateFieldMapping);
  destModelSelect.addEventListener("change", updateFieldMapping);
  generateCardsButton.addEventListener("click", generateCards);

  // Initial population
  log("Connecting to AnkiConnect...");
  populateDecks();
  populateModels();
});
