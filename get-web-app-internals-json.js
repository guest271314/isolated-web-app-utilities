scheduler.postTask(() => {
  const json = JSON.parse(document.getElementById("json").textContent);
  // console.log(json);
  chrome.runtime.sendMessage(
    json,
  );
}, {
  delay: 1000
});
