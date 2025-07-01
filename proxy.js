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
    // Richiedo il link di streaming effettivo
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

    // Genero un file M3U modificato che punta al proxy stesso
    const proxyUrl = `${req.protocol}://${req.get('host')}/proxyStream?stream=${encodeURIComponent(finalUrl)}`;

    const m3uContent = `#EXTM3U
#EXTINF:-1 tvg-logo="http://odmsto.com/uploads/tv_image/sm/rai-2-bobi5do2jjqa.png" group-title="Canali RAI",Rai 2
${proxyUrl}
`;

    res.setHeader('Content-Type', 'application/x-mpegURL');
    return res.send(m3uContent);
  } catch (err) {
    return res.status(500).json({ error: "Errore durante la richiesta", details: err.message });
  }
});

// Endpoint per proxy dello streaming vero
app.get("/proxyStream", async (req, res) => {
  const streamUrl = req.query.stream;
  if (!streamUrl || !streamUrl.startsWith("http")) {
    return res.status(400).send("URL stream mancante o non valido");
  }

  try {
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "HbbTV/1.6.1",
        "Referer": "https://www.raiplay.it/",
        "Origin": "https://www.raiplay.it"
      },
      redirect: "follow"
    });

    // Copio gli headers importanti per il flusso video
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    
    // Stream della risposta al client
    response.body.pipe(res);
  } catch (err) {
    return res.status(500).send("Errore nel proxy dello stream: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy attivo su porta ${PORT}`);
});

