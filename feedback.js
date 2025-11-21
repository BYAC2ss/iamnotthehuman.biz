const form = document.getElementById("feedbackForm");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const hint = document.getElementById("hint");

function encodeMailto(to, subject, body) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

sendBtn.addEventListener("click", () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const subject = document.getElementById("subject").value.trim() || "Feedback";
  const message = document.getElementById("message").value.trim();

  if (!message) {
    hint.textContent = "Please write a short message before sending.";
    return;
  }

  let body = "";
  if (name) body += `Name: ${name}\n`;
  if (email) body += `Email: ${email}\n`;
  body += `\nMessage:\n${message}\n\n---\nSent from feedback form`;

  const mailto = encodeMailto("iamnotthehuman.biz@gmail.com", subject, body);
  window.location.href = mailto;

  hint.textContent = "Opening your mail client...";
});

clearBtn.addEventListener("click", () => {
  form.reset();
  hint.textContent = "";
});
