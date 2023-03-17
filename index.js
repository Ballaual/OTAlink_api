const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();

// Liste der autorisierten API-Schlüssel
const authorizedKeys = [
  "API_KEY_1",
  "API_KEY_2",
  "API_KEY_3",
  "API_KEY_4",
  "API_KEY_5"
];

app.use(bodyParser.json());

// Authentifizierungsfunktion
function authenticate(req, res, next) {
  const apiKey = req.headers["x-api-key"]; // Der API-Schlüssel wird im Header "x-api-key" gesendet
  if (!apiKey) {
    return res.status(401).json({ error: "API-Schlüssel erforderlich" });
  }
  if (!authorizedKeys.includes(apiKey)) {
    return res.status(403).json({ error: "Ungültiger API-Schlüssel" });
  }
  next();
}

// MySQL-Client erstellen
const connection = mysql.createConnection({
  host: "IP",
  user: "USER",
  password: "PASSWORD",
  database: "DATABASE"
});
const table = "TABLE";
const rows = ["id", "zeitstempel", "fachgebiet", "titel", "beschreibung", "indikation", "komplikationen", "siebeinstrumente", "opablauf"];

// Verbindung zur Datenbank herstellen
connection.connect((error) => {
  if (error) {
    console.error("Fehler beim Verbinden zur Datenbank:", error);
  } else {
    console.log("Erfolgreich mit der Datenbank verbunden");
  }
});

// Endpunkt, der eine JSON-Antwort zurückgibt
app.get("/api", authenticate, (req, res) => {
  const query = `SELECT * FROM ${table}`;
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Fehler bei der Abfrage:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    } else {
      res.json(results);
    }
  });
});

// Endpunkt, der JSON-Daten akzeptiert und eine Bestätigungsantwort zurückgibt
app.post("/api", authenticate, (req, res) => {
  const data = req.body;
  console.log(data);
  const values = data.map((operation) => [
    operation.id,
    operation.zeitstempel,
    operation.fachgebiet,
    operation.titel,
    operation.beschreibung,
    operation.indikation,
    operation.komplikationen,
    operation.siebeinstrumente,
    operation.opablauf
  ]);
  connection.query(
    `INSERT INTO ${table} (${rows.join(", ")}) VALUES ?`,
    [values],
    (err) => {
      if (err) {
        console.error("Fehler beim Speichern der Daten: ", err);
        return res.status(500).json({ error: "Fehler beim Speichern der Daten" });
      }
      const response = {
        message: "Daten erfolgreich gespeichert"
      };
      res.json(response);
    }
  );
});

// Starte den Webserver auf Port 3001
app.listen(3001, () => {
  console.log("Server gestartet auf Port 3001");
});
