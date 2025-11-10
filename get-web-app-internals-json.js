onload = async () => {
  let Details;
  const text = document.getElementById("json").textContent;
  ({ InstalledWebApps: { Details } } = JSON.parse(text).find((
    { InstalledWebApps },
  ) => InstalledWebApps));
  Details = Details
    .map((InstalledWebApps) => ({
      "!app_id": InstalledWebApps["!app_id"],
      "!name": InstalledWebApps["!name"],
      "start_url": InstalledWebApps["start_url"],
    }));
  const iframe = document.createElement("iframe");
  iframe.src = `chrome-extension://${chrome.runtime.id}/index.html?Details=${
    JSON.stringify(Details)
  }`;
  document.body.appendChild(iframe);
};
