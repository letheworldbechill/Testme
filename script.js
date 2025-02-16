document.addEventListener("DOMContentLoaded", function() {
  // Variable für den abgeleiteten Verschlüsselungsschlüssel
  let encryptionKey = null;

  // Socket.IO initialisieren
  const socket = io();

  // Taschenrechner Elemente
  const display = document.getElementById("display");
  const buttons = document.querySelectorAll("#buttons .btn");
  const calculatorContainer = document.getElementById("calculator-container");
  const messengerContainer = document.getElementById("messenger-container");
  let currentInput = "";

  // Verschlüsselungseinrichtung
  const identCodeInput = document.getElementById("identCode");
  const setKeyBtn = document.getElementById("setKey");

  setKeyBtn.addEventListener("click", function() {
    const identCode = identCodeInput.value.trim();
    if (identCode === "") {
      alert("Bitte gib einen Identifikationscode ein.");
      return;
    }
    // Ableiten eines 256-Bit Schlüssels aus dem Identifikationscode
    encryptionKey = CryptoJS.SHA256(identCode).toString();
    alert("Schlüssel wurde gesetzt. Jetzt sind deine Nachrichten verschlüsselt!");
  });

  buttons.forEach(button => {
    button.addEventListener("click", function() {
      const value = this.getAttribute("data-value");
      handleInput(value);
    });
  });

  function handleInput(value) {
    if (value === "C") {
      currentInput = "";
      updateDisplay("0");
    } else if (value === "←") {
      currentInput = currentInput.slice(0, -1);
      updateDisplay(currentInput || "0");
    } else if (value === "=") {
      // Prüfen, ob der geheime Code eingegeben wurde
      if (currentInput === "762+762") {
        openMessenger();
      } else {
        try {
          let result = eval(currentInput);
          updateDisplay(result);
          currentInput = result.toString();
        } catch(e) {
          updateDisplay("Error");
          currentInput = "";
        }
      }
    } else {
      currentInput += value;
      updateDisplay(currentInput);
    }
  }

  function updateDisplay(text) {
    display.textContent = text;
  }

  // Taschenrechner ausblenden und Messenger anzeigen
  function openMessenger() {
    calculatorContainer.style.display = "none";
    messengerContainer.style.display = "block";  // Nun block, damit auch der Verschlüsselungsbereich sichtbar ist
  }

  // Messenger Elemente
  const sendBtn = document.getElementById("send-btn");
  const messageInput = document.getElementById("message-input");
  const chatMessages = document.getElementById("chat-messages");

  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  function sendMessage() {
    const msg = messageInput.value.trim();
    if (msg === "") return;
    if (!encryptionKey) {
      alert("Bitte setze zuerst deinen Identifikationscode, um den Schlüssel zu generieren.");
      return;
    }
    // Nachricht clientseitig verschlüsseln
    const encryptedMsg = CryptoJS.AES.encrypt(msg, encryptionKey).toString();
    // Verschlüsselte Nachricht via Socket.IO an den Server senden
    socket.emit("chat message", encryptedMsg);
    messageInput.value = "";
  }

  // Empfang von Nachrichten über Socket.IO
  socket.on("chat message", (encryptedMsg) => {
    if (!encryptionKey) {
      appendMessage("Empfangene Nachricht (verschlüsselt): " + encryptedMsg, "user");
      return;
    }
    // Versuch, die empfangene Nachricht zu entschlüsseln
    let decryptedMsg;
    try {
      decryptedMsg = CryptoJS.AES.decrypt(encryptedMsg, encryptionKey).toString(CryptoJS.enc.Utf8);
      if (!decryptedMsg) throw new Error("Leere Entschlüsselung");
    } catch (e) {
      decryptedMsg = "Unleserliche Nachricht (falscher Schlüssel?)";
    }
    appendMessage(decryptedMsg, "user");
  });

  function appendMessage(message, sender) {
    const li = document.createElement("li");
    li.textContent = message;
    li.classList.add(sender);
    chatMessages.appendChild(li);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
