// Datum immer als "JJJJ-MM-TT" (die Redaktion speichert es ohne Anführungszeichen, YAML macht sonst ein Date-Objekt daraus)
const alsTag = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);

export default {
  eleventyComputed: {
    datum: (data) => alsTag(data.datum),
  },
};
