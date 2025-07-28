const targetNode = document.body;
const config = { childList: true, subtree: true };

const callback = (mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      if (mutation.target.id === "json") {
        scheduler.postTask(() => {
          const json = JSON.parse(mutation.target.textContent);
          console.log(json);
          chrome.runtime.sendMessage(
            json,
          );
          observer.disconnect();
        }, { priority: "background", delay: 500 });
      }
    }
  }
};

const observer = new MutationObserver(callback);
observer.observe(targetNode, config);
