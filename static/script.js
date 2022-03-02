let activeCol = ".channels_col";
let messageInterval = null;
let unreadInterval = null;
let replyToMessageChannel = null;
let replyToMessageId = null;

function postMessage(e) {
  e.preventDefault();

  let new_message = document.querySelector("#text_input").value;

  const urlParams = new URLSearchParams(window.location.search);
  const chat_id = urlParams.get("chat_id");

  let email = localStorage.getItem("email");
  let session_token = localStorage.getItem("session_token");
  //console.log(typeof room);

  fetch("/messages", {
    method: "POST",
    body: JSON.stringify({ new_message, chat_id }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
      Authorization: session_token,
      Email: email,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success == true) {
        addMessagesToScreen([data.message]);
      }
    })
    .catch((err) => console.log(err));
}

function postReply(e) {
  e.preventDefault();

  let new_message = document.querySelector("#reply_input").value;

  replyToMessageChannel;
  replyToMessageId;

  let email = localStorage.getItem("email");
  let session_token = localStorage.getItem("session_token");
  //console.log(typeof room);

  fetch("/reply", {
    method: "POST",
    body: JSON.stringify({
      reply_message_to_id: replyToMessageId,
      chat_id: replyToMessageChannel,
      new_message,
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
      Authorization: session_token,
      Email: email,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success == true) {
        const replyHtml = createReplyHtml(data.message);
        console.log("data from response", data);

        document.querySelector(".replies").append(replyHtml);
      }
    })
    .catch((err) => console.log(err));
}

function startMessagePolling() {
  const urlParams = new URLSearchParams(window.location.search);
  const chat_id = urlParams.get("chat_id");

  const email = localStorage.getItem("email");
  const session_token = localStorage.getItem("session_token");
  fetch("/chat_messages/" + chat_id, {
    method: "GET",
    headers: {
      Authorization: session_token,
      email: email,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      let message_box = document.querySelector(".messages");
      // Check if no messages were added since last time
      message_box.innerHTML = "";
      addMessagesToScreen(data.chat.messages);
    })
    .catch((err) => console.log(err));

  return;
}

function updateUnreadCount(chat_id) {
  const email = localStorage.getItem("email");
  const session_token = localStorage.getItem("session_token");
  fetch("/clear_unread/" + chat_id, {
    method: "POST",
    headers: {
      Authorization: session_token,
      email: email,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      const chatLi = document.querySelector(
        `.chat_container[data-chat_id="${chat_id}"]`
      );
      const counter = chatLi.querySelector(".unread_count_container");
      counter.remove();
    })
    .catch((err) => console.log(err));

  return;
}

function startUnreadPolling() {
  const email = localStorage.getItem("email");
  const session_token = localStorage.getItem("session_token");
  fetch("/unread_counts", {
    method: "GET",
    headers: {
      Authorization: session_token,
      email: email,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      // Update counters
      console.log("unread", data);
      const unread = data.unread;
      unread.forEach((element) => {
        if (element.num_unread > 0) {
          // Show counter next to channel
          const chatLi = document.querySelector(
            `.chat_container[data-chat_id="${element.channel_id}"]`
          );

          const counter = chatLi.querySelector(".unread_count_container");
          if (counter) {
            counter.remove();
          }
          // Create a counter
          const div = document.createElement("div");
          const span = document.createElement("span");
          div.setAttribute("class", "unread_count_container");
          span.innerText = element.num_unread;
          div.append(span);
          chatLi.append(div);
        }
      });
    })
    .catch((err) => console.log(err));

  return;
}

function createMessageHtml(message) {
  const outerDiv = document.createElement("div");
  const contentDiv = document.createElement("div");
  const buttonDiv = document.createElement("div");
  const usernameP = document.createElement("p");
  const bodyP = document.createElement("p");
  const replyBtn = document.createElement("button");
  outerDiv.setAttribute("class", "message");
  usernameP.innerText = message.username + ":";
  bodyP.innerText = message.body;
  replyBtn.innerText = "Reply";
  contentDiv.append(usernameP);
  contentDiv.append(bodyP);
  buttonDiv.append(replyBtn);

  replyBtn.addEventListener("click", function () {
    showReplyScreen(
      message.id,
      message.channel_id,
      message.username,
      message.body,
      message.replies
    );
  });

  // Handle replies
  if (message.replies.length > 0) {
    const showReplies = document.createElement("button");
    showReplies.innerText = `${message.replies.length} ${
      message.replies.length > 1 ? "replies" : "reply"
    }`;
    buttonDiv.append(showReplies);
    showReplies.addEventListener("click", function () {
      showReplyScreen(
        message.id,
        message.channel_id,
        message.username,
        message.body,
        message.replies
      );
    });
  }

  outerDiv.append(contentDiv);
  outerDiv.append(buttonDiv);
  return outerDiv;
}

function createReplyHtml(reply) {
  const div = document.createElement("div");
  const usernameP = document.createElement("p");
  const bodyP = document.createElement("p");
  div.setAttribute("class", "reply");
  usernameP.innerText = reply.username + ":";
  bodyP.innerText = reply.body;
  div.append(usernameP);
  div.append(bodyP);
  return div;
}

function addMessagesToScreen(messages) {
  let message_box = document.querySelector(".messages");
  messages.forEach((element) => {
    const messageHtml = createMessageHtml(element);
    message_box.append(messageHtml);
  });
  return;
}

// TODO
function showReplyScreen(
  messageId,
  channelId,
  originalUser,
  originalMessage,
  replies
) {
  replyToMessageChannel = channelId;
  replyToMessageId = messageId;
  const repliesCol = document.querySelector(".replies_col");
  // Clear previous replies
  document.querySelector(".replies").innerHTML = "";
  const original = document.querySelector(".original_message");
  if (original) {
    original.remove();
  }
  const originalMessageDiv = document.createElement("div");
  const h3 = document.createElement("h3");
  h3.innerText = "Original Message";
  const usernameP = document.createElement("p");
  const bodyP = document.createElement("p");
  originalMessageDiv.setAttribute("class", "original_message");
  usernameP.innerText = originalUser + ":";
  bodyP.innerText = originalMessage;
  originalMessageDiv.append(h3);
  originalMessageDiv.append(usernameP);
  originalMessageDiv.append(bodyP);
  repliesCol.append(originalMessageDiv);

  replies.forEach((reply) => {
    const replyHtml = createReplyHtml(reply);
    document.querySelector(".replies").append(replyHtml);
  });

  // Show the reply col
  showCol(".replies_col");
}

function joinChat(chatId) {
  updateUnreadCount(chatId);
  console.log("chat id,", chatId);
  const email = localStorage.getItem("email");
  const session_token = localStorage.getItem("session_token");
  fetch("/chat_messages/" + chatId, {
    method: "GET",
    headers: {
      Authorization: session_token,
      Email: email,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      showPage(".chat_index_page");
      console.log("chats", data.chat);

      showCol(".messages_col");
      let message_box = document.querySelector(".messages");
      message_box.innerHTML = "";
      addMessagesToScreen(data.chat.messages);
      const urlParams = new URLSearchParams(window.location.search);
      const chat_id = urlParams.get("chat_id");
      if (!chat_id && chat_id !== chatId) {
        history.pushState("", "", "?chat_id=" + chatId);
      }
      clearInterval(messageInterval);
      messageInterval = setInterval(startMessagePolling, 3000);
      createMagicLink(data.chat.magic_link);
    })
    .catch((err) => console.log(err));
}

function showCol(col) {
  document.querySelectorAll(".col").forEach((element) => {
    element.classList.add("hide");
    element.classList.remove("block");
  });
  // Show the relevant page
  document.querySelector(col).classList.remove("hide");
  document.querySelector(col).classList.add("block");

  activeCol = col;
  // console.log("width of page", document.body.clientWidth);
  if (col === ".replies_col" && document.body.clientWidth >= 1200) {
    document.querySelector(".messages_col").classList.remove("hide");
    document.querySelector(".messages_col").classList.add("block");
  }
}

function getUserChats() {
  const email = localStorage.getItem("email");
  const session_token = localStorage.getItem("session_token");
  fetch("/chats/" + email, {
    method: "GET",
    headers: {
      Authorization: session_token,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("chat list data", data);
      const chatList = document.querySelector(".chats");
      // Add each chat to the list of chats
      data.chats.forEach((chat) => {
        const li = document.createElement("li");
        li.setAttribute("class", "chat_container");
        li.dataset.chat_id = chat.channel_id;
        const a = document.createElement("a");
        a.setAttribute("href", "javascript: void(0)");
        a.innerText = chat.channel_name;
        li.append(a);
        chatList.append(li);
        li.addEventListener("click", function () {
          joinChat(chat.channel_id);
        });
      });
    })
    .catch((err) => console.log(err));
}

function showPage(page) {
  // Hide every page
  document.querySelectorAll(".page").forEach((element) => {
    element.style.display = "none";
  });
  // Show the relevant page
  document.querySelector(page).style.display = "block";

  if (page === ".chat_index_page") {
    clearInterval(unreadInterval);
    unreadInterval = setInterval(startUnreadPolling, 3000);
  }
}

document.getElementById("registerLink").addEventListener("click", function () {
  // Show the register screen
  showPage(".register");
});

document.getElementById("login").addEventListener("click", function () {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  fetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { "Content-type": "application/json; charset=UTF-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success === true) {
        showPage(".chat_index_page");
        // Store session token in localStorage
        localStorage.setItem("session_token", data.session_token);
        localStorage.setItem("email", data.email);
        getUserChats();
      } else {
        alert("Wrong username/password");
        // Show unsuccessful login
      }
    })
    .catch((err) => console.log(err));
});

document.getElementById("register").addEventListener("click", function () {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
  }

  fetch("/register", {
    method: "POST",
    body: JSON.stringify({ username, password, email }),
    headers: { "Content-type": "application/json; charset=UTF-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success === true) {
        showPage(".chat_index_page");
        // Store session token in localStorage
        localStorage.setItem("session_token", data.session_token);
        localStorage.setItem("email", data.email);
        getUserChats();
      } else {
        alert(data.error_message);
      }
    })
    .catch((err) => console.log(err));
});

function isLoggedIn() {
  const session_token = localStorage.getItem("session_token");
  const email = localStorage.getItem("email");
  if (!session_token || !email) {
    return showPage(".login");
  }

  fetch("/is_logged_in", {
    method: "POST",
    body: JSON.stringify({ session_token, email }),
    headers: { "Content-type": "application/json; charset=UTF-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("islogged in data", data);
      if (data.success === true) {
        const urlParams = new URLSearchParams(window.location.search);
        const magic_link = urlParams.get("magic_link");
        const chat_id = urlParams.get("chat_id");
        getUserChats();

        if (magic_link) {
          consumeMagicLink(magic_link);
        } else if (chat_id) {
          joinChat(chat_id);
        } else {
          showPage(".chat_index_page");
        }
      } else {
        showPage(".login");
      }
    })
    .catch((err) => console.log(err));
}

document.getElementById("postMessage").addEventListener("click", function (e) {
  // Show the register screen
  postMessage(e);
});
document.getElementById("postReply").addEventListener("click", function (e) {
  // Show the register screen
  postReply(e);
});
document.getElementById("createChat").addEventListener("click", function (e) {
  const session_token = localStorage.getItem("session_token");
  const email = localStorage.getItem("email");
  const channel_name = document.getElementById("newName").value;

  if (!channel_name) {
    return alert("Please provide a chat name");
  }

  fetch("/create", {
    method: "POST",
    body: JSON.stringify({ session_token, email, channel_name }),
    headers: { "Content-type": "application/json; charset=UTF-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("data from creating chat", data);
      if (data.success === true) {
        console.log("chat list data", data);
        const chatList = document.querySelector(".chats");
        // Add each chat to the list of chats

        const li = document.createElement("li");
        li.setAttribute("class", "chat_container");
        li.dataset.chat_id = data.chat.id;
        const a = document.createElement("a");
        a.setAttribute("href", "javascript: void(0)");
        a.innerText = data.chat.channel_name;
        li.append(a);
        chatList.append(li);
        li.addEventListener("click", function () {
          joinChat(data.chat.id);
        });

        joinChat(data.chat.id);
      }
    })
    .catch((err) => console.log(err));
});

function createMagicLink(magic_link) {
  const magicLink = document.getElementById("invite_link");
  magicLink.innerText = "http://localhost:5000/?magic_link=" + magic_link;
}
function consumeMagicLink(magic_link) {
  const session_token = localStorage.getItem("session_token");
  const email = localStorage.getItem("email");
  fetch("/magic_link/" + magic_link, {
    method: "GET",
    headers: {
      Authorization: session_token,
      email: email,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("magic link data", data);
      if (data.success == true) {
        joinChat(data.chat_id);
      }
      history.pushState("", "", "?chat_id=" + data.chat_id);
      // let message_box = document.querySelector(".messages");
      // message_box.innerHTML = "";
      // addMessagesToScreen(data.messages);
      // clearInterval(messageInterval);
      // messageInterval = setInterval(startMessagePolling, 3000);
      // createMagicLink(data.magic_link);
    })
    .catch((err) => console.log(err));
}

document
  .querySelector(".mobile_back_to_channels_button")
  .addEventListener("click", function () {
    showCol(".channels_col");
  });

document
  .querySelector(".mobile_back_to_messages_button")
  .addEventListener("click", function () {
    showCol(".messages_col");
  });

isLoggedIn();

// window.addEventListener("load", loadAnimal);
window.addEventListener("popstate", (newState) => {
  const urlParams = new URLSearchParams(window.location.search);
  const chat_id = urlParams.get("chat_id");
  console.log("popstate running", newState);
  const currUrl = location.href;
  if (currUrl === "http://localhost:5000/") {
    clearInterval(messageInterval);
    showPage(".chat_index_page");
  } else if (chat_id) {
    joinChat(chat_id);
  }
  console.log(
    "file: script.js ~ line 361 ~ window.addEventListener ~ currUrl",
    currUrl
  );
});

// If on load, there is a chat id, send that user to that chat
console.log("running..");

const mediaQuery = window.matchMedia("(min-width: 1200px)");

function handleDesktopChange(e) {
  // Check if the media query is true
  if (e.matches) {
    console.log("matches");
    if (activeCol === ".messages_col") {
      document.querySelector(".channels_col").classList.remove("hide");
      document.querySelector(".channels_col").classList.add("block");
    } else if (activeCol === ".replies_col") {
      console.log("here");
      document.querySelector(".messages_col").classList.remove("hide");
      document.querySelector(".messages_col").classList.add("block");
    }
  } else {
    if (activeCol === ".replies_col") {
      document.querySelector(".messages_col").classList.add("hide");
      document.querySelector(".messages_col").classList.remove("block");
      document.querySelector(".channels_col").classList.add("hide");
      document.querySelector(".channels_col").classList.remove("block");
    } else if (activeCol === ".messages_col") {
      document.querySelector(".channels_col").classList.add("hide");
      document.querySelector(".channels_col").classList.remove("block");
      document.querySelector(".replies").classList.add("hide");
      document.querySelector(".replies").classList.remove("block");
    } else {
      document.querySelector(".messages_col").classList.add("hide");
      document.querySelector(".messages_col").classList.remove("block");
      document.querySelector(".replies_col").classList.add("hide");
      document.querySelector(".replies_col").classList.remove("block");
    }
  }
}

// Register event listener
mediaQuery.addListener(handleDesktopChange);

// Initial check
handleDesktopChange(mediaQuery);
