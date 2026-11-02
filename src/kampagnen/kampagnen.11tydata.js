// Start/Ende immer als "JJJJ-MM-TT": Die Redaktion speichert Daten ohne Anführungszeichen,
// YAML macht daraus sonst Date-Objekte (→ „noch NaN Tage“ auf der Karte)
const alsTag = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);

export default {
  eleventyComputed: {
    start: (data) => alsTag(data.start),
    ende: (data) => alsTag(data.ende),
  },
};
