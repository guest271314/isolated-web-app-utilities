# isolated-web-app-utilities
Isolated Web App Utilities

This was recently not blocked on Chromium Developer Build and Chrome-For-Testing when called from DevTools `console` and Snippets

```
var iwa = open("isolated-app://<IWA_ID>");
```

That capability is now blocked, see [window.open("isolated-app://<ID>") is blocked](https://issues.chromium.org/issues/339994757#comment6)

> This is a side effect of crrev.com/c/5466063, but is the intended behavior.
> 
> ...

This repository provides capabilities to open `isolated-app:` URL's from arbitrary Web pages, including `chrome://` and `chrome-extension:` URL's using `chrome.windows.create()` called by different programmatic means. 

### Open isolated-app: window from Web pages, chrome:, chrome-extension: URL's
So far opening IWA windows including the following approaches that discretely work:

- Handle `web_accessible_resources` `iframe` request
- Handle `fetch()` request - from/to the current Web page, excluding `chrome:`.
- Handle `document.title` update.
- Get `chrome://wet-app-internals` JSON to filter IWA by `!name` and get `start_url`. Inject extension ID into all Web pages for `web_accessible_resources` request. Get injected extension extension ID in Web page, delete private origin file.
- Network request including name of IWA or other string in URL.

### Utilities 
AFAIK no (extension or other) API exists to get installed Isolated Web App details programmatically. `getWebAppInternalsDetails()` in `background.js` gets installed Isolated Web App details from the JSON in `chrome://web-app-internal`. 

### Installation

Fetch the GitHub repository and install the unpacked extension as normal on `chrome://extensions` in Developer mode.

### Usage

Substitute the names of your Isolated Web Apps accordingly. Tested in DevTools `console` and Snippets on Chromium Version 126.0.6477.0 (Developer Build) (64-bit).

#### `document.title`

```
function setTitle(data) {
  const title = document.title;
  document.title = title + data;
  document.title = title;
}

setTitle(`?name=TCPServerSocket`);
```

IWA window launched in `tabs.onUpdated` event handler.

#### `web_accessible_resources` request

Using `web_accessible_resource` and a global function injected into the tab with dynamic content scripts appends an `iframe` with `src` set to a `chrome-extension:` URL to the current `document` which makes a request that is intercepted by `onfetch` event handler in MV3 `ServiceWorker`

```
const params = new URLSearchParams();
params.append("name", "Signed Web Bundle in Isolated Web App");
params.append("sdp", btoa(local.localDescription.sdp));
openIsolatedWebApp(`?${params.toString()}`);
```

#### Network request intercepted by `declarativeNetRequest` rules

Launch in `declarativeNetRequest.onRuleMatchedDebug` event handler

```
fetch(`?name=TCPServerSocket`);
```


### License

Do What the Fuck You Want to Public License [WTFPLv2](http://www.wtfpl.net/about/)
