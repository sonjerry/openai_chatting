const nicknameContainer = document.getElementById("nickname-container");
const nicknameInput = document.getElementById("nickname-input");
const nicknameSubmit = document.getElementById("nickname-submit");
const matchBtn = document.getElementById("match-btn");
const matchingFeedback = document.getElementById("matching-feedback");

const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

let username = localStorage.getItem("nickname") || "";
let history = [];

function showMatchButton() {
  nicknameSubmit.style.display = "none";
  matchBtn.style.display = "inline-block";
}

function showChat() {
  nicknameContainer.style.display = "none";
  chatContainer.style.display = "flex";
}

if (username) {
  showChat();
} else {
  showMatchButton();
}

nicknameSubmit.addEventListener("click", () => {
  const nick = nicknameInput.value.trim();
  if (!nick) return;
  username = nick;
  localStorage.setItem("nickname", username);
  showMatchButton();
});

matchBtn.addEventListener("click", () => {
  matchingFeedback.textContent = "매칭중...";
  matchingFeedback.style.display = "block";
  matchBtn.disabled = true;

  const delay = 1000 + Math.random() * 4000; // 1~5초 랜덤

  setTimeout(() => {
    matchingFeedback.textContent = "";
    matchingFeedback.style.display = "none";
    showChat();
    appendMessage("시스템", "매칭이 성공했습니다", "system");
  }, delay);
});


// ===== 메시지 전송 조건 처리 =====
let pendingMessage = "";
let pendingTimer = null;

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage(username, message, "user");
  chatInput.value = "";

  pendingMessage = message;
  clearTimeout(pendingTimer);

  pendingTimer = setTimeout(() => {
    if (chatInput.value.trim() === "") {
      sendMessageToChatbot(pendingMessage);
      pendingMessage = "";
    } else {
      console.log("입력값 변경 감지 → 전송 취소");
    }
  }, 2000);
});

chatInput.addEventListener("input", () => {
  if (pendingMessage) {
    clearTimeout(pendingTimer);
    pendingMessage = "";
    console.log("입력 중 감지 → 서버 전송 취소");
  }
});

// ===== 서버 전송 + 응답 처리 =====
async function sendMessageToChatbot(message) {
  console.log("서버 전송됨:", message);

  

  const res = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      name: username,
      history,
    }),
  });

  const data = await res.json();

  

  if (data.reply) {
    appendAssistantSentences("상대", data.reply);
    history = data.history;
  }
}

// ===== 말풍선 출력 =====
function appendMessage(sender, text, role) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", role);

  const nick = document.createElement("span");
  nick.className = "nickname";
  nick.textContent = sender;

  const content = document.createElement("span");
  content.textContent = text;

  msgDiv.appendChild(nick);
  msgDiv.appendChild(content);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendAssistantSentences(sender, reply) {
  const parts = splitSentencesStrict(reply);

  // 1. 유저 마지막 메시지 길이 추정
  let lastUserMsg = "";
  if (history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "user") {
        lastUserMsg = history[i].content || "";
        break;
      }
    }
  }

  // 2. 첫 말풍선: 유저 메시지 길이에 따라 생각하는 시간(랜덤성 포함)
  const userLen = lastUserMsg.length;
  const minThink = 400;
  const maxThink = 1800;
  let thinkDelay = Math.floor(userLen * 10 + Math.random() * 600);
  thinkDelay = Math.max(minThink, Math.min(maxThink, thinkDelay));

  let totalDelay = 0;

  parts.forEach((part, idx) => {
    // 3. 각 말풍선: 문장 길이에 따라 입력중 딜레이 (랜덤성 포함)
    const baseTyping = 900;
    const typingPerChar = 150;
    const typingRandom = Math.random() * 400;
    const typingDelay = baseTyping + part.length * typingPerChar + typingRandom;

    if (idx === 0) {
      // 첫 말풍선: 생각하는 시간 -> 입력중 표시 -> 입력중 딜레이 -> 출력
      setTimeout(() => {
        appendTypingIndicator();
        setTimeout(() => {
          removeTypingIndicator();
          appendMessage(sender, part, "assistant");
        }, typingDelay);
      }, thinkDelay);

      totalDelay = thinkDelay + typingDelay + 300;
    } else {
      // 두 번째 이후: 누적 딜레이 -> 입력중 표시 -> 입력중 딜레이 -> 출력
      setTimeout(() => {
        appendTypingIndicator();
        setTimeout(() => {
          removeTypingIndicator();
          appendMessage(sender, part, "assistant");
        }, typingDelay);
      }, totalDelay);

      totalDelay += typingDelay + 300;
    }
  });
}




function splitByEmotionChunk(sentence) {
  const regex = /([ㅋㅎㅠ]{2,})/g;
  const result = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(sentence)) !== null) {
    const endIdx = regex.lastIndex;
    const part = sentence.slice(lastIndex, endIdx).trim();
    if (part) result.push(part);
    lastIndex = endIdx;
  }

  const remaining = sentence.slice(lastIndex).trim();
  if (remaining) result.push(remaining);

  return result;
}

// ===== 문장 + 어절 기준 분할 =====
function splitSentencesStrict(text) {
  const result = [];

  // 1️⃣ 기본 문장 분해 (.?!… 기준)
  const raw = text.match(/[^,.?!…]+(?:\.{3}|[.?!])*/g) || [text];

  for (let s of raw) {
    let trimmed = s.trim();

    // 2️⃣ 단일 마침표만 제거
    if (trimmed.endsWith(".") && !trimmed.endsWith("..") && !trimmed.endsWith("...") && !trimmed.endsWith(",")) {
      trimmed = trimmed.slice(0, -1);
    }

    // 3️⃣ 감정어 기준 재분할 (ㅋ or ㅎ 3개 이상)
    const chunks = splitByEmotionChunk(trimmed);

    for (const chunk of chunks) {
      const subChunks = splitByFixedChunkSize(chunk.trim());
      result.push(...subChunks);
    }
  }

  return result;
}


// ===== 어절 수가 3 또는 4로 나눠떨어지면 분할 =====
function splitByFixedChunkSize(sentence) {
  const words = sentence.split(/\s+/);
  const total = words.length;
  const result = [];

  if (total % 3 === 0) {
    for (let i = 0; i < total; i += 3) {
      result.push(words.slice(i, i + 3).join(" "));
    }
  } else if (total % 4 === 0) {
    for (let i = 0; i < total; i += 4) {
      result.push(words.slice(i, i + 4).join(" "));
    }
  } else {
    return [sentence];
  }

  return result;
}


// ===== 입력 중입니다... 표시 =====
function appendTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("message", "assistant");
  typingDiv.id = "typing-indicator";

  const nick = document.createElement("span");
  nick.className = "nickname";
  nick.textContent = "상대";

  const content = document.createElement("span");
  content.className = "typing";
  content.textContent = "입력 중입니다...";

  typingDiv.appendChild(nick);
  typingDiv.appendChild(content);
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingIndicator() {
  const typingDiv = document.getElementById("typing-indicator");
  if (typingDiv) {
    typingDiv.remove();
  }
}
