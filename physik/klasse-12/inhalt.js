// Inhaltsverzeichnis Physik 12 (grundlegendes Anforderungsniveau), Schulbuch: Physik Bayern 12, C.C. Buchner.
// VORLÄUFIG: Teile = Lernbereiche des LehrplanPLUS, Kapitel sinnvoll gebündelt.
// Sobald das Inhaltsverzeichnis des Buchs vorliegt, Kapitelnamen und Nummern daran anpassen.
// "ordner" eintragen, sobald ein Kapitel Material hat → dort liegt kapitel.js.
Portal.klasse({
  teile: [
    { id: 'A', name: 'Statische elektrische und magnetische Felder', themen: [
      { nr: 1, name: 'Elektrisches Feld, Feldlinien und Superposition' },
      { nr: 2, name: 'Kondensator: Kapazität, Auf- und Entladen' },
      { nr: 3, name: 'Potential und Spannung' },
      { nr: 4, name: 'Geladene Teilchen im elektrischen Feld' },
      { nr: 5, name: 'Magnetische Flussdichte und Lorentzkraft' },
      { nr: 6, name: 'Technische Anwendungen (Geschwindigkeitsfilter, Massenspektrometer, Hall-Effekt, Teilchenbeschleuniger)' },
    ]},
    { id: 'B', name: 'Elektromagnetische Induktion und Schwingungen', themen: [
      { nr: 7, name: 'Magnetischer Fluss und Induktionsgesetz' },
      { nr: 8, name: 'Wechselspannung und technische Anwendungen' },
      { nr: 9, name: 'Selbstinduktion' },
      { nr: 10, name: 'Elektromagnetischer Schwingkreis' },
    ]},
    { id: 'C', name: 'Elektromagnetische Wellen', themen: [
      { nr: 11, name: 'Dipol- und Mikrowellenstrahlung' },
      { nr: 12, name: 'Interferenz und Wellenlängenbestimmung' },
      { nr: 13, name: 'Röntgenstrahlung und elektromagnetisches Spektrum' },
    ]},
  ],
});
