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
    
    // Show Good Points
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
    
    // Show Bad Points
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
  const domain = new URL(url).hostname;
  const category = detectCategory(url);

  // Check HTTPS
  if (!url.startsWith("https://")) {
    score -= 30;
    reasons.push("Site does not use HTTPS.");
  } else {
    good.push("Uses HTTPS");
  }

  // Keyword/category check
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

  // WHOIS check using API Ninjas
  try {
    const whoisRes = await fetch(`https://api.api-ninjas.com/v1/whois?domain=${domain}`, {
      headers: {
        'X-Api-Key': 'YOUR_API_NINJAS_KEY_HERE'
      }
    });

    const whoisData = await whoisRes.json();
    const createdAt = new Date(whoisData.creation_date);
    const now = new Date();
    const ageMonths = (now - createdAt) / (1000 * 60 * 60 * 24 * 30);

    if (ageMonths < 6) {
      score -= 20;
      reasons.push("Domain is very new (less than 6 months old).");
    } else {
      good.push("Domain has existed for more than 6 months");
    }
  } catch (err) {
    console.warn("WHOIS lookup failed:", err);
    reasons.push("Could not verify domain age.");
  }

  return {
    score: Math.max(score, 0),
    reasons,
    goodPoints: good,
    category
  };
}
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    const suspiciousPatterns = ["bet", "casino", "slot", "adserver", "tracking", "popup"];
    const links = Array.from(document.querySelectorAll('a'));
    const scripts = Array.from(document.querySelectorAll('script'));
    const iframes = Array.from(document.querySelectorAll('iframe'));

    const suspiciousLinks = links.filter(a => suspiciousPatterns.some(p => a.href.includes(p)));
    const suspiciousScripts = scripts.filter(s => suspiciousPatterns.some(p => (s.src || "").includes(p)));
    const suspiciousIframes = iframes.filter(i => suspiciousPatterns.some(p => (i.src || "").includes(p)));

    return {
      links: suspiciousLinks.length,
      scripts: suspiciousScripts.length,
      iframes: suspiciousIframes.length
    };
  }
}, (injectionResults) => {
  const result = injectionResults[0].result;
  // You can use this to lower the score dynamically
});

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
