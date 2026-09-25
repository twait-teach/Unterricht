/* Zugang: Benutzername + Passwort vor jeder Seite (Sichtschutz).
   ACHTUNG: Das ist ein Schutz im Browser, kein echter Serverschutz. Er hält Unbeteiligte ab, die zufällig die Adresse
   öffnen. Wer die Dateien direkt abruft (z. B. im öffentlichen GitHub-Repository), sieht sie trotzdem.
   Zugangsdaten: kern/zugang-daten.js (nur Prüfwerte, nie Passwörter; mehrere Zugänge möglich) – erzeugt mit kern/zugang-einrichten.html.
   Fehlt diese Datei, ist die Seite offen. Abmelden (entfernt auch den gespeicherten GitHub-Token): beliebige Seite mit ?abmelden öffnen. */
'use strict';
(() => {
  if (window.Zugang) return;
  const basis = document.currentScript.src.replace(/[^/]*$/, '');
  const KEY = 'unterricht-zugang';
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const bytes = h => Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));

  // Erlaubte Prüfwerte: neues Format { hashes: [{n, h}] } oder altes Format { hash }.
  const erlaubt = cfg => (cfg.hashes || [cfg.hash]).map(x => (x && x.h) || x).filter(Boolean);

  async function ableiten(benutzer, passwort, salt, iter) {
    const roh = new TextEncoder().encode(benutzer.trim().toLowerCase() + '\n' + passwort);
    const k = await crypto.subtle.importKey('raw', roh, 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(salt), iterations: iter }, k, 256));
  }
  window.Zugang = { ableiten, erlaubt };

  if (/[?&]abmelden\b/.test(location.search)) { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); localStorage.removeItem('unterricht-github-token'); } catch { /* egal */ } }

  const stil = document.createElement('style');
  stil.textContent = `html.gesperrt{overflow:hidden}html.gesperrt body>*:not(#zugang){visibility:hidden!important}
#zugang{position:fixed;inset:0;z-index:99999;background:#edf1f5;display:grid;place-items:center;font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;color:#18232e}
#zugang form{background:#fff;padding:28px 30px;border-radius:10px;box-shadow:0 3px 20px #24374520;width:min(92vw,340px);display:grid;gap:12px}
#zugang h1{font:normal 22px Cambria,Caladea,Georgia,serif;margin:0 0 4px;color:#2e74b5}
#zugang label{display:grid;gap:4px;font-size:14px}#zugang label.merk{display:flex;gap:8px;align-items:center}
#zugang input:not([type=checkbox]){font:inherit;font-size:16px;padding:8px 10px;border:1px solid #bac8d3;border-radius:6px}
#zugang button{font:inherit;font-size:16px;padding:9px;border:0;border-radius:6px;background:#245c89;color:#fff;cursor:pointer}
#zugang .fehler{margin:0;color:#c32e2e;font-size:14px;min-height:1.2em}`;
  document.head.append(stil);
  document.documentElement.classList.add('gesperrt');

  const gemerkt = () => { try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch { return null; } };
  const frei = () => { document.documentElement.classList.remove('gesperrt'); document.getElementById('zugang')?.remove(); };

  function formular(cfg) {
    const bau = () => {
      const d = document.createElement('div'); d.id = 'zugang';
      d.innerHTML = `<form><h1>Unterricht · Gymnasium Dorfen</h1>
        <label>Benutzername<input name="username" autocomplete="username" autocapitalize="none" required></label>
        <label>Passwort<input name="password" type="password" autocomplete="current-password" required></label>
        <label class="merk"><input type="checkbox" name="merken" checked> Auf diesem Gerät angemeldet bleiben</label>
        <button type="submit">Anmelden</button><p class="fehler" role="alert"></p></form>`;
      document.body.append(d);
      const f = d.querySelector('form'), fehler = d.querySelector('.fehler');
      f.username.focus();
      f.onsubmit = async e => {
        e.preventDefault(); fehler.textContent = '';
        try {
          const h = await ableiten(f.username.value, f.password.value, cfg.salt, cfg.iter);
          if (!erlaubt(cfg).includes(h)) { fehler.textContent = 'Benutzername oder Passwort stimmt nicht.'; f.password.select(); return; }
          (f.merken.checked ? localStorage : sessionStorage).setItem(KEY, h);
          location.reload();
        } catch { fehler.textContent = 'Anmeldung nicht möglich (Browser ohne Krypto-Funktion oder Speicher gesperrt).'; }
      };
    };
    document.body ? bau() : addEventListener('DOMContentLoaded', bau);
  }

  const s = document.createElement('script');
  s.src = basis + 'zugang-daten.js?v=' + Date.now();
  s.onload = () => {
    const cfg = window.ZUGANG;
    if (!cfg) return frei();
    if (erlaubt(cfg).includes(gemerkt())) return frei();
    formular(cfg);
  };
  s.onerror = () => { console.warn('Zugang: kern/zugang-daten.js fehlt – die Seite ist ohne Passwort offen.'); frei(); };
  document.head.append(s);
})();
