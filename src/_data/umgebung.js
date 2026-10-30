// Nur die echte Domain darf von Suchmaschinen erfasst werden – Testadressen (*.netlify.app, lokal) nicht.
export default {
  indexieren: process.env.CONTEXT === "production" && /sparverein\.de/.test(process.env.URL || ""),
};
