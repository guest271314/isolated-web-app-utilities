// Handle web_accessible_resources iframe request
self.addEventListener("fetch", async (event) => {
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
      console.log(webAppDetails);
      const window = await openIsolatedWebApp(
        webAppDetails,
        entries.get("name"),
      );
      console.log(window);
    }
  } catch (e) {
    console.error(chrome.runtime.lastError, e);
  }
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
    if (title?.includes("?name=TCPServerSocket")) {
      console.log(tab.url, title);
      const webAppDetails = await getWebAppInternalsDetails();
      console.log(webAppDetails);
      const window = await openIsolatedWebApp(
        webAppDetails,
        "TCPServerSocket",
      );
      console.log(window);
    }
    if (title?.includes("?sdp=") && !tab.url.startsWith("isolated-app:")) {
      console.log(tab.url);
      const re = /\?sdp=.+/;
      const webAppDetails = await getWebAppInternalsDetails();
      console.log(webAppDetails);
      const [sdp] = title.match(re);
      const window = await openIsolatedWebApp(
        webAppDetails,
        "Signed Web Bundle in Isolated Web App",
        sdp,
      );
      console.log(window);
    }
    if (url?.includes("isolated-app")) {
      console.log(tab.url);
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
      persistAcrossSessions: false,
      matches: ["chrome://web-app-internals/*"],
      runAt: "document_idle",
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
    console.log(isolatedWebAppName, detail);
    const url = webAppDetails.find((webapp) =>
      webapp["!name"] === isolatedWebAppName
    )
      .start_url;
    return await chrome.windows.create({
      url: `${url}${detail}`,
      height: 0,
      width: 0,
      left: 0,
      top: 0,
      focused: false,
      type: "normal",
    });
  } catch (e) {
    console.error(chrome.runtime.lastError, e);
  }
}

// Get chrome://web-app-internals JSON
async function getWebAppInternalsDetails() {
  try {
    const { id, tabs: [{ id: tabId }] } = await chrome.windows.create({
      url: "chrome://web-app-internals",
      state: "minimized",
      focused: false,
    });
    const { resolve, promise } = Promise.withResolvers();
    const handleMessage = async (message) => {
      resolve(message);
      chrome.runtime.onMessage.removeListener(handleMessage);
      await chrome.windows.remove(id);
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    const result = await promise;
    const { InstalledWebApps: { Details } } = result.find((
      { InstalledWebApps },
    ) => InstalledWebApps);
    return Details;
  } catch (e) {
    console.error(chrome.runtime.lastError, e);
  }
}
