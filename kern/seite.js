/* Kopfleiste für einfache Inhaltsseiten: Zurück zum Portal + Drucken. */
'use strict';
{ if (!window.Zugang) { const z = document.createElement('script'); z.src = document.currentScript.src.replace(/[^/]*$/, 'zugang.js'); document.head.append(z); } } // Zugangsschutz sicherstellen
(() => {
  const src = document.currentScript.getAttribute('src');
  const wurzel = src.slice(0, src.lastIndexOf('kern/'));
  const von = new URLSearchParams(location.search).get('von') || '';
  const leiste = document.createElement('nav');
  leiste.className = 'seiten-leiste';
  leiste.innerHTML = '<a class="zurueck"></a><button type="button">Drucken</button>';
  leiste.querySelector('a').href = wurzel + 'index.html' + (von ? '#' + von : '');
  leiste.querySelector('a').textContent = '← Zurück zur Übersicht';
  leiste.querySelector('button').onclick = () => window.print();
  document.body.prepend(leiste);
})();
