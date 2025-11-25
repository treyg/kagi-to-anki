// Popup script

import { getCardCount } from "../utils/storage";

const cardCountEl = document.getElementById("card-count") as HTMLSpanElement;
const ankiStatusEl = document.getElementById("anki-status") as HTMLDivElement;
const testConnectionBtn = document.getElementById(
  "test-connection"
) as HTMLButtonElement;
const openOptionsBtn = document.getElementById(
  "open-options"
) as HTMLButtonElement;

// Load card count
async function loadStats() {
  const count = await getCardCount();
  cardCountEl.textContent = count.toString();
}

// Test Anki connection
async function testAnkiConnection() {
  ankiStatusEl.classList.remove("connected", "disconnected");
  ankiStatusEl.querySelector(".status-text")!.textContent = "Checking...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TEST_ANKI_CONNECTION",
    });

    if (response.connected) {
      ankiStatusEl.classList.add("connected");
      ankiStatusEl.querySelector(".status-text")!.textContent =
        "Anki Connected";
    } else {
      ankiStatusEl.classList.add("disconnected");
      ankiStatusEl.querySelector(".status-text")!.textContent =
        "Anki Not Running";
    }
  } catch (error) {
    ankiStatusEl.classList.add("disconnected");
    ankiStatusEl.querySelector(".status-text")!.textContent =
      "Connection Failed";
  }
}

// Event listeners
testConnectionBtn.addEventListener("click", testAnkiConnection);

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Initialize
loadStats();
testAnkiConnection();
