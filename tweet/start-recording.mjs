const debuggingPort = process.argv[2] || "9222";
const action = process.argv[3] || "start";
const endpoint = `http://127.0.0.1:${debuggingPort}`;

async function waitForPage() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page" && target.url.includes("/tweet/"));
      if (page) return page;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The teaser page did not become available for recording.");
}

const page = await waitForPage();
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const resolve = pending.get(message.id);
  if (!resolve) return;
  pending.delete(message.id);
  resolve(message);
});

function evaluate(expression) {
  commandId += 1;
  socket.send(JSON.stringify({
    id: commandId,
    method: "Runtime.evaluate",
    params: { expression, returnByValue: true },
  }));
  return new Promise((resolve) => pending.set(commandId, resolve));
}

for (let attempt = 0; attempt < 100; attempt += 1) {
  const response = await evaluate("window.teaserReady === true");
  if (response.result?.result?.value === true) break;
  if (attempt === 99) throw new Error("The teaser did not finish preloading its first frame.");
  await new Promise((resolve) => setTimeout(resolve, 100));
}

if (action === "start") await evaluate("startTeaser()");
socket.close();
