document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("scoreDisplay").textContent = "Loading...";

  chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    const url = new URL(tabs[0].url);
    const domain = url.hostname;
    document.getElementById("currentSite").textContent = `🔎 ${domain}`;

    const scoreData = await calculateSmartScore(url.href);
    document.getElementById("scoreDisplay").textContent = `🔐 Security Score: ${scoreData.score}/100`;

    const reasonsList = document.getElementById("reasonsList");
    reasonsList.innerHTML = "";

    const goodPoints = scoreData.goodPoints;
    const badPoints = scoreData.reasons;
    
    if (goodPoints.length > 0) {
      const goodTitle = document.createElement("p");
      goodTitle.innerHTML = "✅ <b>Good Points:</b>";
      reasonsList.appendChild(goodTitle);
      goodPoints.forEach(point => {
        const li = document.createElement("li");
        li.textContent = point;
        reasonsList.appendChild(li);
      });
    }

    if (badPoints.length > 0) {
      const badTitle = document.createElement("p");
      badTitle.innerHTML = "❌ <b>Bad Points:</b>";
      reasonsList.appendChild(badTitle);
      badPoints.forEach(point => {
        const li = document.createElement("li");
        li.textContent = point;
        reasonsList.appendChild(li);
      });
    }

    const alt = suggestAlternatives(scoreData.category);
    if (alt.length > 0) {
      document.getElementById("alternativesBlock").innerHTML = `<p>🧭 Try safer sites:</p><ul>${alt.map(a => `<li><a href="https://${a}" target="_blank">${a}</a></li>`).join("")}</ul>`;
    }
  });
});

async function calculateSmartScore(url) {
  let score = 100;
  const reasons = [];
  const good = [];
  const category = detectCategory(url);

  if (!url.startsWith("https://")) {
    score -= 30;
    reasons.push("Site does not use HTTPS.");
  } else {
    good.push("Uses HTTPS");
  }

  if (category === "gambling") {
    score -= 40;
    reasons.push("This site is related to gambling.");
  } else {
    good.push("No known risky category");
  }

  if (url.includes("bet") || url.includes("casino")) {
    score -= 30;
    reasons.push("Suspicious keywords found in URL.");
  } else {
    good.push("No suspicious keywords found in URL");
  }

  return {
    score: Math.max(score, 0),
    reasons,
    goodPoints: good,
    category
  };
}

function detectCategory(url) {
  if (url.includes("bet") || url.includes("casino")) return "gambling";
  if (url.includes("movie") || url.includes("watch")) return "movies";
  if (url.includes("news")) return "news";
  return "general";
}

function suggestAlternatives(category) {
  const map = {
    gambling: ["gamblersanonymous.org", "betblocker.org"],
    movies: ["imdb.com", "rottentomatoes.com"],
    news: ["bbc.com", "reuters.com"]
  };
  return map[category] || [];
}
