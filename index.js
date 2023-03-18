const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const fs = require("fs");

// Liste der autorisierten API-Schlüssel
const authorizedKeys = [
  "API_KEY1",
  "API_KEY2",
  "API_KEY3",
  "API_KEY4",
  "API_KEY5"
];

// Erstelle die Log-Datei, falls sie nicht vorhanden ist
const logFilePath = "./access.log";
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '');
}

// Loggt Anfragen in der Console und speichert diese in eine Logdatei
function logRequest(req, res, next) {
  const date = new Date().toISOString();
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const method = req.method;
  const url = req.url;
  let statusCode;
  const apiKey = req.headers["x-api-key"];
  let message = "Gültiger API-Schlüssel";

  res.on("finish", () => {
    statusCode = res.statusCode;
    if (statusCode === 401) {
      message = "API-Schlüssel erforderlich";
    } else if (statusCode === 403) {
      message = "Ungültiger API-Schlüssel";
    }

    console.log(`${date} [${ip}] "${method} ${url}" ${statusCode} ${message}: ${apiKey}`);
    fs.appendFileSync("access.log", `${date} [${ip}] "${method} ${url}" ${statusCode} ${message}: ${apiKey}\n`);
  });

  next();
}

// Erstelle einen Request Handler mit Express.js
const app = express();
app.use(logRequest);

// Authentifizierungsfunktion
app.use(bodyParser.json());

function authenticate(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    res.status(401).json({ error: "API-Schlüssel erforderlich" });
  } else if (!authorizedKeys.includes(apiKey)) {
    res.status(403).json({ error: "Ungültiger API-Schlüssel" });
  } else {
    next();
  }
}

// MySQL-Client erstellen
const connection = mysql.createConnection({
  host: "HOSTNAME_OR_IP",
  user: "USERNAME",
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
app.get("/v1", authenticate, (req, res) => {
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
app.post("/v1", authenticate, (req, res) => {
  const data = req.body;
  console.log(data);

  const values = data.filter((item) => {
    return item.id && item.zeitstempel && item.fachgebiet && item.titel && item.beschreibung && item.indikation && item.komplikationen && item.siebeinstrumente && item.opablauf;
  }).map((item) => [
    item.id,
    item.zeitstempel,
    item.fachgebiet,
    item.titel,
    item.beschreibung,
    item.indikation,
    item.komplikationen,
    item.siebeinstrumente,
    item.opablauf
  ]);

  const query = `SELECT id FROM ${table} WHERE id IN (?)`;
  connection.query(query, [data.map((item) => item.id)], (err, results) => {
    if (err) {
      console.error("Fehler beim Überprüfen des Primärschlüssels: ", err);
      return res.status(500).json({ error: "Interner Serverfehler" });
    }

    const existingIds = results.map((result) => result.id);
    const newValues = values.filter((value) => !existingIds.includes(value[0]));

    connection.query(
      `INSERT INTO ${table} (${rows.join(", ")}) VALUES ?`,
      [newValues],
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
});

// Starte den Webserver auf Port 3001
app.listen(3001, () => {
  console.log("Server gestartet auf Port 3001");
});