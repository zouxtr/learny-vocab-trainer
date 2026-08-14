/**
 * UI strings for the German locale (source: English).
 * Keys are the exact English strings used in the app; the `translate()`
 * helper falls back to English for any key missing here.
 */

import { registerDictionary } from "@/lib/i18n";

registerDictionary("de", {
  // Navigation & chrome
  Home: "Start",
  Dictionaries: "Wörterbücher",
  Study: "Lernen",
  Help: "Hilfe",
  Primary: "Primär",
  "Cmd + S": "Strg + S",
  "How it works": "So funktioniert's",
  Expand: "Erweitern",
  Collapse: "Einklappen",
  Dictionary: "Wörterbuch",
  "Light mode": "Hellmodus",
  "Dark mode": "Dunkelmodus",
  "System theme": "Systemdesign",

  // Home
  "My dictionaries": "Meine Wörterbücher",
  "Manage your vocabulary lists and get started with study sessions.":
    "Verwalte deine Vokabellisten und starte Lern-Sitzungen.",
  "New dictionary": "Neues Wörterbuch",
  "You don’t have any dictionaries yet. Create one to start adding words.":
    "Du hast noch keine Wörterbücher. Erstelle eines, um Wörter hinzuzufügen.",
  "Create your first dictionary": "Erstelle dein erstes Wörterbuch",
  Favorites: "Favoriten",
  "All dictionaries": "Alle Wörterbücher",

  // Dictionary list
  "Search, favorite and organize your vocabulary lists.":
    "Suche, markiere und organisiere deine Vokabellisten.",
  "Search by name or language…": "Nach Name oder Sprache suchen…",
  All: "Alle",
  "★ Favorites": "★ Favoriten",
  "No dictionaries yet. Create one to get started.":
    "Noch keine Wörterbücher. Erstelle eines, um zu starten.",
  "No dictionaries match your search.":
    "Keine Wörterbücher entsprechen deiner Suche.",

  // Dictionary form
  "Create dictionary": "Wörterbuch erstellen",
  "Create a dictionary": "Wörterbuch erstellen",
  "Edit dictionary": "Wörterbuch bearbeiten",
  Name: "Name",
  "A label like “Spanish for travel”.": "Ein Name wie „Spanisch für Reisen“.",
  "My vocabulary": "Mein Wortschatz",
  "Word language": "Wortsprache",
  "Translation language": "Übersetzungssprache",
  "The two languages must differ.": "Die beiden Sprachen müssen sich unterscheiden.",
  Color: "Farbe",
  Cancel: "Abbrechen",
  "Save changes": "Änderungen speichern",

  // Counts
  word: "Wort",
  words: "Wörter",

  // Dictionary card
  "Add word": "Wort hinzufügen",
  Unfavorite: "Kein Favorit",
  Favorite: "Favorit",
  Unarchive: "Archiv aufheben",
  Archive: "Archivieren",
  "Delete dictionary": "Wörterbuch löschen",
  "Click delete again to confirm.": "Klicke erneut auf Löschen, um zu bestätigen.",
  "Add word to {name}": "Wort zu {name} hinzufügen",

  // Word form
  "Edit word": "Wort bearbeiten",
  "Add a word": "Wort hinzufügen",
  "The word in {name}": "Das Wort auf {name}",
  "The translation in {name}": "Die Übersetzung auf {name}",
  Grammar: "Grammatik",
  "e.g. feminine noun": "z. B. weibliches Nomen",
  Group: "Gruppe",
  "e.g. Food": "z. B. Essen",
  Example: "Beispiel",
  Notes: "Notizen",

  // Dictionary page
  "Dictionary not found.": "Wörterbuch nicht gefunden.",
  "Back to home": "Zurück zur Startseite",
  Refresh: "Aktualisieren",
  "Refreshing…": "Aktualisiere…",
  Edit: "Bearbeiten",
  Delete: "Löschen",
  "Confirm?": "Bestätigen?",
  "Search words or translations…": "Nach Wörtern oder Übersetzungen suchen…",
  "In order": "In Reihenfolge",
  "Newest first": "Neueste zuerst",
  "Word (A–Z)": "Wort (A–Z)",
  "Translation (A–Z)": "Übersetzung (A–Z)",
  "Most missed": "Meist falsch",
  Export: "Exportieren",
  Import: "Importieren",
  "No words yet. Add your first word to start building this dictionary.":
    "Noch keine Wörter. Füge dein erstes Wort hinzu, um dieses Wörterbuch aufzubauen.",
  "Add your first word": "Füge dein erstes Wort hinzu",
  "No words match your search.": "Keine Wörter entsprechen deiner Suche.",
  Translation: "Übersetzung",
  "Delete word": "Wort löschen",

  // Import dialog
  "Import words": "Wörter importieren",
  "Bulk-add words to {name} ({pair}).":
    "Füge Wörter zu {name} ({pair}) in großen Mengen hinzu.",
  "Upload file": "Datei hochladen",
  "Google Sheets": "Google Sheets",
  "TSV link": "TSV-Link",
  "How to format your data": "So formatierst du deine Daten",
  "{name} column — the word you want to learn.":
    "{name}-Spalte – das Wort, das du lernen möchtest.",
  "{name} column — its translation.":
    "{name}-Spalte – die Übersetzung.",
  "Optional columns: Grammar, Example, Group.":
    "Optionale Spalten: Grammatik, Beispiel, Gruppe.",
  "Rows missing a word or translation are skipped automatically.":
    "Zeilen ohne Wort oder Übersetzung werden automatisch übersprungen.",
  "Download template": "Vorlage herunterladen",
  "Public Google Sheets link": "Öffentlicher Google-Sheets-Link",
  "Public TSV file link": "Öffentlicher TSV-Dateilink",
  "In your sheet: {steps}, copy the share link, and paste it here. Nothing is sent to our servers — the browser fetches the published tab directly.":
    "In deiner Tabelle: {steps}, kopiere den Freigabe-Link und füge ihn hier ein. Es wird nichts an unsere Server gesendet – der Browser ruft den veröffentlichten Tab direkt ab.",
  "Fetch": "Abrufen",
  "Choose a .csv or .xlsx file": "Wähle eine .csv- oder .xlsx-Datei",
  "The first row is usually a header; you can adjust the mapping below.":
    "Die erste Zeile ist normalerweise eine Kopfzeile; du kannst die Zuordnung unten anpassen.",
  "Parsing…": "Analysiere…",
  "First row contains column headers": "Erste Zeile enthält Spaltenüberschriften",
  "Assign the Word and Translation columns before importing.":
    "Weise die Spalten Wort und Übersetzung zu, bevor du importierst.",
  "No data rows.": "Keine Datenzeilen.",
  "Column mapping": "Spaltenzuordnung",
  "Map each column below to a field. Unused columns can be left as “Skip”.":
    "Ordne jede Spalte einem Feld zu. Unbenutzte Spalten können auf „Überspringen“ bleiben.",
  Skip: "Überspringen",
  "Imported {imported} word(s), skipped {skipped} duplicate(s) or invalid row(s).":
    "{imported} Wort(er) importiert, {skipped} Duplikat(e) oder ungültige Zeile(n) übersprungen.",
  Close: "Schließen",

  // Study
  "Pick a dictionary, configure a session, and review its words with spaced repetition.":
    "Wähle ein Wörterbuch, konfiguriere eine Sitzung und wiederhole die Wörter mit verteiltem Lernen.",
  "No dictionaries yet. Create one and add words before studying.":
    "Noch keine Wörterbücher. Erstelle eines und füge Wörter hinzu, bevor du lernst.",
  Flashcards: "Karteikarten",
  "Multiple choice": "Mehrfachauswahl",
  Typing: "Tippen",
  "Source → Target": "Quelle → Ziel",
  "Target → Source": "Ziel → Quelle",
  "All words": "Alle Wörter",
  "Every word in the dictionary": "Jedes Wort im Wörterbuch",
  Random: "Zufällig",
  "Pick a fixed-size random sample": "Wähle eine zufällige Stichprobe fester Größe",
  Choose: "Auswählen",
  "Manually tick words to include": "Markiere Wörter manuell zum Einfügen",
  "Sort by": "Sortieren nach",
  Mode: "Modus",
  Direction: "Richtung",
  "Words to include": "Einzubeziehende Wörter",
  Count: "Anzahl",
  "Between 1 and {max}": "Zwischen 1 und {max}",
  "Shuffle order": "Reihenfolge mischen",
  "Randomize card order": "Kartenreihenfolge mischen",
  "{x} of {y} selected": "{x} von {y} ausgewählt",
  "Clear all": "Alle entfernen",
  "Select all": "Alle auswählen",
  "Start studying": "Lernen starten",
  "Start session": "Sitzung starten",
  Back: "Zurück",
  Correct: "Richtig",
  Wrong: "Falsch",
  "Card {x} / {y}": "Karte {x} / {y}",
  "Type your answer, then check": "Tippe deine Antwort, dann prüfen",
  "Not quite — answer: {answer}": "Fast — Antwort: {answer}",
  "How well did you know it?": "Wie gut kanntest du es?",
  Previous: "Zurück",
  Next: "Weiter",
  "Click the card to reveal": "Klicke auf die Karte, um sie aufzudecken",
  "Type the grammar notes…": "Tippe die Grammatik-Notizen…",
  "Type the translation…": "Tippe die Übersetzung…",
  "Check answer": "Antwort prüfen",
  "Session complete": "Sitzung abgeschlossen",
  Accuracy: "Genauigkeit",
  "{n} word(s) reviewed this session.":
    "{n} Wort(er) in dieser Sitzung wiederholt.",
  "Start another session": "Weitere Sitzung starten",

  // Field / selects
  "(optional)": "(optional)",
  "Select…": "Auswählen…",
  "Select language": "Sprache auswählen",

  // Onboarding & help
  "Welcome to LearnY!": "Willkommen bei LearnY!",
  "Build your vocabulary dictionaries and turn them into study sessions. Here’s how it works.":
    "Erstelle deine Vokabel-Wörterbücher und verwandle sie in Lern-Sitzungen. So funktioniert's.",
  "I’ll explore first": "Ich schaue mir zuerst um",
  "What is LearnY!?": "Was ist LearnY!?",
  "A vocabulary trainer that turns your word lists into interactive study sessions. Everything runs locally in your browser.":
    "Ein Vokabeltrainer, der deine Wortlisten in interaktive Lern-Sitzungen verwandelt. Alles läuft lokal in deinem Browser.",
  "Each dictionary is a vocabulary list with a language pair — the word language and the translation language. Examples: English → Spanish, Bulgarian → German.":
    "Jedes Wörterbuch ist eine Vokabelliste mit einem Sprachenpaar – der Wortsprache und der Übersetzungssprache. Beispiele: Englisch → Spanisch, Bulgarisch → Deutsch.",
  "A word has a source term and a translation, plus optional fields (grammar, example, group, notes). Review your list anytime.":
    "Ein Wort hat einen Begriff und eine Übersetzung, plus optionale Felder (Grammatik, Beispiel, Gruppe, Notizen). Überprüfe deine Liste jederzeit.",
  "Pick a dictionary and practice its words with study sessions. Progress and spaced-repetition are tracked for each word.":
    "Wähle ein Wörterbuch und übe seine Wörter mit Lern-Sitzungen. Fortschritt und verteiltes Lernen werden für jedes Wort erfasst.",
  "Got it": "Verstanden",

  // Sync
  "Cloud sync": "Cloud-Synchronisierung",
  "Connected to {provider}.": "Mit {provider} verbunden.",
  "Offline — no cloud backup.": "Offline – kein Cloud-Backup.",
  "Sync now": "Jetzt synchronisieren",
  "Disconnect {provider}": "{provider} trennen",
  "Connect {provider}": "{provider} verbinden",

  // System
  "System status": "Systemstatus",
  "Checking database connection…": "Prüfe Datenbankverbindung…",
  "Failed to check database: {error}": "Datenbankprüfung fehlgeschlagen: {error}",
  "SQLite ready (v{version}).": "SQLite bereit (v{version}).",
  "Card {n} / {total}": "Karte {n} / {total}",
  "Connect {name}": "{name} verbinden",
  "Connected to {name}.": "Mit {name} verbunden.",
  "Disconnect {name}": "{name} trennen",
  "GitHub link or any public URL serving TSV). The browser fetches it directly — nothing is sent to our servers.": "GitHub-Link oder eine beliebige öffentliche URL, die TSV bereitstellt). Der Browser ruft sie direkt ab – nichts wird an unsere Server gesendet.",
  "Imported {n} words, skipped {m} duplicates or invalid rows.": "{n} Wort(er) importiert, {m} Duplikate oder ungültige Zeilen übersprungen.",
  "In your sheet:": "In deiner Tabelle:",
  "Paste a direct link to a tab-separated text file (for example a": "Füge einen direkten Link zu einer tabulatorgetrennten Textdatei ein (z. B. einen",
  "Raw": "Roh",
  "Share → Anyone with the link → Viewer": "Freigeben → Jeder mit dem Link → Betrachter",
  "Sheet synced: {a} added, {u} updated, {r} removed, {s} skipped.{removals}": "Tabellenblatt synchronisiert: {a} hinzugefügt, {u} aktualisiert, {r} entfernt, {s} übersprungen.{removals}",
  "Skip column": "Spalte überspringen",
  "Word": "Wort",
  "Words": "Wörter",
  "copy the share link and paste it here. Nothing is sent to our servers — the browser fetches the published tab directly.": "kopiere den Freigabe-Link und füge ihn hier ein. Es wird nichts an unsere Server gesendet – der Browser ruft den veröffentlichten Tab direkt ab.",
  "data row": "Datenzeile",
  "data rows": "Datenzeilen",
  "fetched.": "abgerufen.",
  "is the column for its translation.": "ist die Spalte für seine Übersetzung.",
  "is the column for the word you want to learn.": "ist die Spalte für das Wort, das du lernen möchtest.",
  "{n} of {m} selected": "{n} von {m} ausgewählt",
  "{n} tables · {size}": "{n} Tabellen · {size}",
  "{n} words reviewed this session.": "{n} Wort(er) in dieser Sitzung wiederholt.",
  "{n} word{s} in the dictionary but not in the sheet were kept": "{n} Wort{er} im Wörterbuch, aber nicht in der Tabelle, wurden behalten.",
});