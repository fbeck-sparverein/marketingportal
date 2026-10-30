import fs from "node:fs";
// Nur Zielgruppen mit eigener Formatseite (Print hat keine)
export default JSON.parse(fs.readFileSync(new URL("./zielgruppen.json", import.meta.url))).filter((z) => z.seite);
