chrome.webNavigation.onBeforeNavigate.addListener(async details => {
  const url = new URL(details.url);

  // Skip checking chrome internal pages
  if (url.protocol === "chrome:") return;

  const isDangerous = await checkWithGoogleSafeBrowsing(url.href);

  if (isDangerous) {
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


async function checkWithGoogleSafeBrowsing(fullUrl) {
  const API_KEY = "AIzaSyD2XPjpyXceJsuTRSomF9I474TrJzJctTk"; // ← Replace this with your real key

  const body = {
    client: { clientId: "SafeWebGuard", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: fullUrl }]
    }
  };

  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return !!data.matches;
  } catch (e) {
    console.error("Safe Browsing API error:", e);
    return false;
  }
}
