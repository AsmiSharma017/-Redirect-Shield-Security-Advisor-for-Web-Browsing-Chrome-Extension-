chrome.webNavigation.onBeforeNavigate.addListener(async details => {
  const url = new URL(details.url);

  if (url.protocol === "chrome:") return;

  const domain = url.hostname;
  if (domain.includes("casino") || domain.includes("bet")) {
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL("blocked.html")
    });
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.transitionType === 'client_redirect' || details.transitionType === 'server_redirect') {
    chrome.runtime.sendMessage({
      type: 'REDIRECT_DETECTED',
      from: details.referrer,
      to: details.url
    });
  }
});
