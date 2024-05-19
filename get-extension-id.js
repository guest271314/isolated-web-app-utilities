(async () => {
  const context = !!(chrome?.extension || chrome?.scripting);
  // console.log(context ? "ISOLATED" : "MAIN");
  try {
    const dir = await navigator.storage.getDirectory();
    const handle = await dir.getFileHandle("id", { create: context });
    if (context) {
      await new Blob([chrome.runtime.id]).stream().pipeTo(
        await handle.createWritable(),
      );
    } else {
      const file = await handle.getFile();
      const id = await file.text();
      await dir.removeEntry(handle.name);
      globalThis.openIsolatedWebApp = (iwaDetails) => {
        const src = `chrome-extension://${id}/index.html${iwaDetails}`;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);
        iframe.onload = (e) => {
          console.log(e);
          iframe.remove();
        };
        iframe.src = src;
      };
      console.log("openIsolatedWebApp() declared");
    }
    // console.log(await Array.fromAsync(dir.keys()));
  } catch (e) {
    console.log(e);
  }
})();
