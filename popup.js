let articleText = "";
let chatHistory = [];
let apiKey;  // This will now be provided by the user
const apiUrl = "https://api.openai.com/v1/chat/completions";
let responseContent;

document.addEventListener("DOMContentLoaded", function () {
  const diagnosticForm = document.getElementById("diagnosticForm");
  const diagnosticCodeInput = document.getElementById("diagnosticCode");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const startButton = document.getElementById("startButton");
  const chat = document.getElementById("chat");
  const messageBox = document.getElementById("messageBox");
  const sendButton = document.getElementById("sendButton");

  // Hide the API key input and chat elements initially
  apiKeyInput.style.display = "none";
  messageBox.style.display = "none";
  sendButton.style.display = "none";

  startButton.addEventListener("click", function () {
    const diagnosticCode = diagnosticCodeInput.value.trim();

    if (diagnosticCode === "hi") {
      alert("The diagnostic has determined that you would not be a good fit for the AI tool based on empirical research-backed findings.");
    } else if (diagnosticCode === "lo") {
      // Show the API key input field
      apiKeyInput.style.display = "block";

      // Wait for the user to enter their OpenAI API key
      apiKeyInput.addEventListener("change", function () {
        apiKey = apiKeyInput.value.trim();
        if (apiKey) {
          diagnosticForm.style.display = "none";  // Hide diagnostic form
          chat.style.display = "block";
          messageBox.style.display = "block";
          sendButton.style.display = "block";

          // Extract the article text when the popup is opened
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: extractArticleText
            }, (results) => {
              if (results && results[0].result) {
                articleText = results[0].result;
                startDiscussion(articleText); // Start the discussion immediately
              }
            });
          });
        }
      });
    } else {
      alert("Invalid diagnostic code. Please try again.");
    }
  });

  // Handle sending messages
  sendButton.addEventListener("click", function () {
    let message = messageBox.value.trim();

    if (message) {
      // Add the user's message to the chat thread
      addMessageToChat(message, "user-message");

      // Clear the message box
      messageBox.value = "";

      // Send the user's message to GPT and continue the conversation
      continueDiscussion(message);
    }
  });
});

// Function to start the discussion with GPT using the article text
function startDiscussion(text) {
  const initialPrompt = `You are a world class, helpful, tutor and I, the user (at a high school level), am a student. Lead a Socratic discussion with me to understand the provided text better. Do this as a back and forth conversation, not a rigid structure. Your messages should always end with a question for the student. Try adding onto my answers to push me towards a better understanding than what I currently have. If I’m confused, try to explain and teach me what I’m confused about. If I don't know the answer to most of your questions or am not participatory, simplify the questions slightly. I am taking a multiple choice test about this passage after I talk with you so the ultimate goal is for you to help me answer questions that ask things of the following nature: determine main ideas; locate and interpret significant details; understand sequences of events; make comparisons; comprehend cause-effect relationships; determine the meaning of context-dependent words, phrases, and statements; draw generalizations; analyze the author’s or narrator’s voice and method; analyze claims and evidence in arguments. Keep all your messages concise. Avoid summarizing the passage. Avoid asking questions that are obvious and shallow. Importantly, focus on asking questions about big picture ideas, instead of tunneling in on little details and specific parts of the text. Be broad, but not so broad that it is too open ended and difficult for me to answer the question, which would make me quit. Ensure that the concepts and questions in your messages are not too advanced, and are simple enough for me to understand.  Expect less than 5 responses from me, so make sure the first couple messages are big picture so I don't miss it. If I keep talking, you should eventually go into more specific detail to advance understanding. You are the teacher, not the student, so you just say your parts, not answering for the student. For example, do not send a huge message with a whole pre-mapped out conversation (tutor: says this, student: says this [what you expect the student would say], tutor: says this, etc). This is the passage you will be applying the socratic method to help the user understand (ensure your responses are no more than around 50 words): ${text}`;
  chatHistory.push({ role: "user", content: initialPrompt });

  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,  // Use the user's API key
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: chatHistory,
      temperature: 0.7,
    }),
  })
    .then(response => response.json())
    .then(data => {
      responseContent = data.choices[0].message.content;
      chatHistory.push({ role: "assistant", content: responseContent });
      addMessageToChat(responseContent, "assistant-message");

      // Enable the send button after the assistant's response
      sendButton.disabled = false;
    })
    .catch(error => console.error("Error:", error));
}

// Function to continue the discussion with GPT using user input
function continueDiscussion(userMessage) {
  chatHistory.push({ role: "user", content: userMessage });

  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,  // Use the user's API key
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: chatHistory,
      temperature: 0.7,
    }),
  })
    .then(response => response.json())
    .then(data => {
      const assistantMessage = data.choices[0].message.content;
      chatHistory.push({ role: "assistant", content: assistantMessage });
      addMessageToChat(assistantMessage, "assistant-message");
    })
    .catch(error => console.error("Error:", error));
}

// Function to add a message to the chat thread
function addMessageToChat(text, messageType) {
  let chat = document.getElementById("chat");
  let messageElement = document.createElement("div");
  messageElement.className = "message " + messageType;
  messageElement.textContent = text;
  chat.appendChild(messageElement);
  chat.scrollTop = chat.scrollHeight; // Scroll to the bottom
}

// Function to extract text from an article on a webpage
function extractArticleText() {
  let article = document.querySelector('article');
  if (article) {
    return article.innerText;
  } else {
    return document.body.innerText; // Fallback to body text if no article tag is found
  }
}
