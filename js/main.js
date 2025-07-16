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

  function saveConfiguration() {
    const config = {
      sourceDeck: sourceDeckSelect.value,
      destDeck: destDeckSelect.value,
      sourceModel: sourceModelSelect.value,
      destModel: destModelSelect.value,
      numCards: numCardsInput.value,
      fieldMappings: getFieldMappingsFromUi(),
    };
    localStorage.setItem("ankiCardGeneratorConfig", JSON.stringify(config));
  }

  async function loadConfiguration() {
    const configString = localStorage.getItem("ankiCardGeneratorConfig");
    if (!configString) {
      log("No saved configuration found.");
      // Initial population if no config
      await populateDecks();
      await populateModels();
      return;
    }

    log("Loading saved configuration...");
    const config = JSON.parse(configString);

    // Populate dropdowns first
    await populateDecks();
    await populateModels();

    // Set values from config
    sourceDeckSelect.value = config.sourceDeck || "";
    destDeckSelect.value = config.destDeck || "";
    sourceModelSelect.value = config.sourceModel || "";
    destModelSelect.value = config.destModel || "";
    numCardsInput.value = config.numCards || 10;

    // Update field mapping UI based on selected models
    await updateFieldMapping();

    // Apply saved field mappings
    if (config.fieldMappings) {
      Object.entries(config.fieldMappings).forEach(
        ([destField, sourceField]) => {
          const select = fieldMappingUi.querySelector(
            `select[data-dest-field="${destField}"]`
          );
          if (select) {
            select.value = sourceField;
          }
        }
      );
      log("Field mappings restored.");
    }

    log("Configuration loaded.");
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
      // Don't call updateFieldMapping here, loadConfiguration will handle it.
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
      saveConfiguration(); // Save config when mapping UI is updated
    } catch (e) {
      log(`Error updating field mapping: ${e.message}`);
      fieldMappingSection.style.display = "none";
    }
  }

  function getFieldMappingsFromUi() {
    const mappings = {};
    fieldMappingUi.querySelectorAll("select").forEach((select) => {
      if (select.value) {
        mappings[select.dataset.destField] = select.value;
      }
    });
    return mappings;
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

      log(
        `Finding mature cards in deck "${sourceDeck}" of type "${sourceModel}"...`
      );
      const matureCardSelector = `("is:review" -"is:learn") AND "prop:ivl>=21"AND -("is:buried" OR "is:suspended")`;
      const query = `deck:"${sourceDeck}" note:"${sourceModel}" ${matureCardSelector}`;
      let cardIds = await anki.findCards(query);
      log(`Found ${cardIds.length} potential mature source cards.`);

      if (cardIds.length === 0) {
        log("No matching mature cards found.");
        return;
      }

      // Shuffle the card IDs to pick randomly
      for (let i = cardIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardIds[i], cardIds[j]] = [cardIds[j], cardIds[i]];
      }

      const cardsToProcessIds = cardIds.slice(0, numCards);
      const notesInfo = await anki.notesInfo(cardsToProcessIds);
      log(`Randomly selected ${notesInfo.length} cards to process.`);

      const fieldMappings = getFieldMappingsFromUi();

      if (Object.keys(fieldMappings).length === 0) {
        log("No field mappings configured. Aborting.");
        return;
      }

      let createdCount = 0;
      for (const sourceNote of notesInfo) {
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

  // Add event listeners to save config on change
  sourceDeckSelect.addEventListener("change", saveConfiguration);
  destDeckSelect.addEventListener("change", saveConfiguration);
  numCardsInput.addEventListener("change", saveConfiguration);
  fieldMappingUi.addEventListener("change", (e) => {
    if (e.target.tagName === "SELECT") {
      saveConfiguration();
    }
  });

  // Initial population
  log("Connecting to AnkiConnect...");
  loadConfiguration();
});
