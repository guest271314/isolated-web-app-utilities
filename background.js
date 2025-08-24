addEventListener("install", async (e) => {
  console.log(e.type);
  e.addRoutes({
    condition: {
      urlPattern: new URLPattern({ hostname: "*" }),
    },
    source: "fetch-event",
  });
  e.waitUntil(self.skipWaiting());
});

addEventListener("activate", async (e) => {
  console.log(e.type);
  e.waitUntil(self.clients.claim());
});

addEventListener("message", async (e) => {
  console.log(e.type, e.data);
});
// Handle web_accessible_resources iframe request
self.addEventListener("fetch", async (event) => {
  // console.log(event);
  event.respondWith((async () => {
    try {
      const requestUrl = new URL(event.request.url);
      const entries = requestUrl.searchParams;
      if (entries.has("sdp")) {
        const webAppDetails = await getWebAppInternalsDetails();
        console.log(webAppDetails);
        const window = await openIsolatedWebApp(
          webAppDetails,
          entries.get("name"),
          `?${entries.toString()}`,
        );
      }
      if (!entries.has("sdp")) {
        const webAppDetails = await getWebAppInternalsDetails();
        // console.log(webAppDetails);
        const window = await openIsolatedWebApp(
          webAppDetails,
          entries.get("name"),
        );
        // console.log(event.request, window);
      }
    } catch (e) {
      console.error(chrome.runtime.lastError, e);
    }
    return fetch(event.request);
  })());
});

// Handle fetch() request - from/to the current Web page, excluding chrome:
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
  async (event) => {
    console.log(event);
    try {
      if (
        (await chrome.tabs.query({
          windowType: "app",
          title: "TCPServerSocket",
        }))
          .length === 0
      ) {
        const webAppDetails = await getWebAppInternalsDetails();
        console.log(webAppDetails);
        const window = await openIsolatedWebApp(
          webAppDetails,
          "TCPServerSocket",
        );
        console.log(window);
      }
    } catch (e) {
      console.error(chrome.runtime.lastError, e);
    }
  },
);

// Handle document.title update
chrome.tabs.onUpdated.addListener(async (tabId, { title, url }, tab) => {
  try {
    let window = void 0;
    if (title?.includes("?name=TCPServerSocket")) {
      console.log(tab.url, title);
      const webAppDetails = await getWebAppInternalsDetails();
      console.log(webAppDetails);
      window = await openIsolatedWebApp(
        webAppDetails,
        "TCPServerSocket",
      );
    }
    if (title?.includes("?sdp=") && !tab.url.startsWith("isolated-app:")) {
      console.log(tab.url);
      const re = /\?sdp=.+/;
      const webAppDetails = await getWebAppInternalsDetails();
      console.log(webAppDetails);
      const [sdp] = title.match(re);
      window = await openIsolatedWebApp(
        webAppDetails,
        "Signed Web Bundle in Isolated Web App",
        sdp,
      );
    }
    if (
      title?.includes("TCPSocket") &&
      !tab.url.startsWith("isolated-app:")
    ) {
      console.log(tab.url);
      const webAppDetails = await getWebAppInternalsDetails();
      console.log(webAppDetails);
      window = await openIsolatedWebApp(
        webAppDetails,
        "TCPSocket",
      );
    }
    if (url?.includes("isolated-app")) {
      // console.log(tab.url, window);
    }
  } catch (e) {
    console.log(chrome.runtime.lastError, e);
  }
});

chrome.runtime.onInstalled.addListener(async (reason) => {
  console.log(reason);
});

// Get wet-app-internals JSON
// Inject extension ID into all Web pages for web_accessible_resources request
// Get injected extension extension ID in Web page, delete private origin file
chrome.scripting.unregisterContentScripts().then(() =>
  chrome.scripting
    .registerContentScripts([{
      id: "get-iwa-details",
      js: ["get-web-app-internals-json.js"],
      matches: ["chrome://web-app-internals/*"],
      persistAcrossSessions: true,
      matchOriginAsFallback: true,
      allFrames: true,
      runAt: "document_start",
      world: "ISOLATED",
    }, {
      id: "set-extension-id",
      js: ["get-extension-id.js"],
      persistAcrossSessions: false,
      matches: ["<all_urls>", "chrome://*/*"],
      world: "ISOLATED",
      runAt: "document_start",
    }, {
      id: "get-extension-id",
      js: ["get-extension-id.js"],
      persistAcrossSessions: false,
      matches: ["<all_urls>", "chrome://*/*"],
      world: "MAIN",
      runAt: "document_idle",
    }])
).catch((e) => console.error(chrome.runtime.lastError, e));

// Open IWA window
async function openIsolatedWebApp(
  webAppDetails,
  isolatedWebAppName,
  detail = "",
) {
  try {
    // console.log(isolatedWebAppName, detail);
    const url = webAppDetails.find((webapp) =>
      webapp["!name"] === isolatedWebAppName
    )
      .start_url;

    const window = await chrome.windows.create({
      url: `${url}${detail}`,
      height: 0,
      width: 0,
      left: 0,
      top: 0,
      focused: false,
      type: "normal",
    });
    if (isolatedWebAppName === "TCPServerSocket") {
      /*
      globalThis.nativeMessagingPort = chrome.runtime.connectNative(
        "sockets",
      );
      globalThis.nativeMessagingPort.onDisconnect.addListener((port) => {
        if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError);
        }
        console.log(port);
      });
      */
      async function handleRemove(id) {
        // console.log(window, id);
        if (id === window.id) {
          // console.log(window);
          // globalThis.nativeMessagingPort.disconnect();
          chrome.windows.onRemoved.removeListener(handleRemove);
        }
      }
      chrome.windows.onRemoved.addListener(handleRemove);
    }
    if (isolatedWebAppName === "Signed Web Bundle in Isolated Web App") {
      // Update IWA URL after creation to include SDP
      // https://issues.chromium.org/issues/426833112
      const tab = await chrome.tabs.update(window.tabs[0].id, {
        url: `${url}${detail}`,
      });
    }

    return window;
  } catch (e) {
    console.error(chrome.runtime.lastError, e);
  }
}

// Get chrome://web-app-internals JSON
async function getWebAppInternalsDetails() {
  // console.log("getWebAppInternalsDetails");
  let Details;
  try {
    const dir = await navigator.storage.getDirectory();
    Details = await dir.getFileHandle("web-app-internals.json")
      .then((handle) =>
        handle.getFile().then((file) => new Response(file).json())
      )
      .catch((e) => e.name);
    if (Details === "NotFoundError") {
      const [tab] = await chrome.tabs.query({ active: true });
      const { resolve, promise } = Promise.withResolvers();
      async function handleMessage(message) {
        // console.log(message, id);
        await chrome.windows.remove(id);
        resolve(message);
        chrome.runtime.onMessage.removeListener(handleMessage);
        return true;
      }
      chrome.runtime.onMessage.addListener(handleMessage);
      const { id, tabs: [{ id: tabId }] } = await chrome.windows.create({
        url: "chrome://web-app-internals",
        state: "minimized",
        focused: false,
      });
      const result = await promise;
      ({ InstalledWebApps: { Details } } = result.find((
        { InstalledWebApps },
      ) => InstalledWebApps));
      const handle = await dir.getFileHandle("web-app-internals.json", {
        create: true,
      });
      const writable = await handle.createWritable();
      await new Blob([JSON.stringify(Details)], {
        type: "application/json",
      }).stream().pipeTo(writable);
    }
    return Details;
  } catch (e) {
    console.error(chrome.runtime.lastError, e);
  }
}
