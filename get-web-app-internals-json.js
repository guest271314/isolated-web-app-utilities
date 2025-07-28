const targetNode = document.documentElement;
const config = { childList: true, subtree: true };
const callback = (mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      console.log(mutation);
      if (mutation.target.id === "json") {
          const json = JSON.parse(mutation.target.textContent);
          console.log(json);
          chrome.runtime.sendMessage(
            json,
          );
          observer.disconnect();
      }
    }
  }
};
const observer = new MutationObserver(callback);
observer.observe(targetNode, config);
