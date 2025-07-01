const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

app.get("/resolve", async (req, res) => {
  const { cont, url } = req.query;

  let targetUrl;

  if (cont) {
    targetUrl = `http://mediapolis.rai.it/relinker/relinkerServlet.htm?cont=${cont}&output=7&forceUserAgent=raiplayappletv`;
  } else if (url) {
    try {
      const decoded = decodeURIComponent(url);
      if (!/^https?:\/\/.+/.test(decoded)) {
        return res.status(400).json({ error: "URL non valido" });
      }
      targetUrl = decoded;
    } catch (err) {
      return res.status(400).json({ error: "URL malformato" });
    }
  } else {
    return res.status(400).json({ error: "Fornire 'cont' o 'url' come parametro" });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "HbbTV/1.6.1",
        "Referer": "https://www.raiplay.it/",
        "Origin": "https://www.raiplay.it"
      },
      redirect: "follow"
    });

    const finalUrl = response.url;

    if (!finalUrl.endsWith(".m3u8")) {
      return res.status(500).json({ error: "URL finale non valido", finalUrl });
    }

    return res.json({ streamUrl: finalUrl });
  } catch (err) {
    return res.status(500).json({ error: "Errore durante la richiesta", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy attivo su porta ${PORT}`);
});

