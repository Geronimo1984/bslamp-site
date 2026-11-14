// Разметка страницы — чистая функция: собирается и в браузере, и при сборке (предотрисовка для поисковиков)
import { BRAND, MODEL_CREDITS } from './content.js';
import { contactLinks } from './order.js';

export const NAV = ['services', 'cases', 'process', 'about'];
export const PAUSE = (id, text) => `<section id="p-${id}" class="pause" aria-label="${esc(text)}"><p class="pause-text reveal">${text}</p></section>`;



const ICONS = {
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  plug: '<path d="M7 12h10M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0zM12 17v4"/>',
  barcode: '<path d="M4 5v14M7 5v14M10 5v14M14 5v14M16 5v14M20 5v14"/>',
  migrate: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  support: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M6.3 6.3l3.5 3.5M14.2 14.2l3.5 3.5M17.7 6.3l-3.5 3.5M9.8 14.2l-3.5 3.5"/>',
  auto: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6"/>',
  tg: '<path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
  phone: '<path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-1-2.5c3 0 6-2 6-5.5a4.5 4.5 0 0 0-1.3-3.2 4 4 0 0 0-.1-3.3s-1.1-.3-3.4 1.3a12 12 0 0 0-6.2 0C6.7 2.7 5.6 3 5.6 3a4 4 0 0 0-.1 3.3A4.5 4.5 0 0 0 4.2 9.5C4.2 13 7.2 15 10 15a3 3 0 0 0-1 2.5V21"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Окно в стиле интерфейса 1С «Такси»
export function taxiWindow(title, body, { cls = '', commands = '' } = {}) {
  return `
  <div class="win ${cls}">
    <div class="win-title">
      <span class="win-nav" aria-hidden="true"><i class="star">☆</i></span>
      <span class="win-title-text">${title}</span>
      <span class="win-ctl" aria-hidden="true"><i>⋮</i><i>▢</i><i>×</i></span>
    </div>
    ${commands ? `<div class="win-cmd">${commands}</div>` : ''}
    <div class="win-body">${body}</div>
  </div>`;
}

// Все кейсы целиком — для поисковиков (в браузере их сразу заменяет окно «Такси» с листанием)
function casesStatic(t) {
  const L = t.cases.labels;
  return t.cases.items.map((c, i) => `
    <article class="case-static">
      <h3>${L.case} ${String(i + 1).padStart(2, '0')}: ${c.title}</h3>
      <p>${L.industry}: ${c.who}. ${L.config}: ${c.config}.</p>
      <p>${L.task}: ${c.task}</p>
      <p>${L.solution}: ${c.solution}</p>
      <p>${L.result}: ${c.result}</p>
    </article>`).join('');
}

export function appMarkup(t, lang, { number, today }) {
  return `  <header class="top">
    <a class="brand" href="#hero" aria-label="${esc(t.meta.title)}">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path class="bulb" d="M16 3.5a9 9 0 0 0-5.4 16.2c.9.7 1.4 1.7 1.4 2.8V24h8v-1.5c0-1.1.5-2.1 1.4-2.8A9 9 0 0 0 16 3.5z"/>
        <g class="filament"><rect x="12" y="9" width="1.4" height="9"/><rect x="14.4" y="9" width=".8" height="9"/><rect x="16.2" y="9" width="2" height="9"/><rect x="19.1" y="9" width=".8" height="9"/></g>
        <rect class="base" x="12" y="25.5" width="8" height="3" rx="1.2"/>
      </svg>
      <span class="brand-name">BSL<b>amp</b></span>
      <span class="brand-tag">${lang === 'ru' ? 'разработка 1С' : '1C development'}</span>
    </a>
    <nav class="nav">
      ${NAV.map((s) => `<a href="#${s}">${t.nav[s]}</a>`).join('')}
    </nav>
    <div class="top-actions">
      <button class="theme-btn" type="button" data-theme-toggle aria-label="${lang === 'ru' ? 'Переключить тему' : 'Toggle theme'}">
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      </button>
      <button class="lang" type="button" data-lang>${t.lang}</button>
      <a class="btn btn-y btn-sm" href="#order">${t.nav.order}</a>
      <button class="menu-btn" type="button" aria-label="${lang === 'ru' ? 'Меню' : 'Menu'}" aria-expanded="false" aria-controls="nav-mobile">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
  <nav class="nav-mobile" id="nav-mobile" aria-label="${lang === 'ru' ? 'Меню' : 'Menu'}">
    <div class="nm-links">
      ${NAV.map((s, i) => `<a href="#${s}"><span class="nm-num">0${i + 1}</span><span class="nm-label">${t.nav[s]}</span><span class="nm-arrow" aria-hidden="true">→</span></a>`).join('')}
    </div>
    <a class="btn btn-y nm-cta" href="#order">${t.hero.cta}</a>
    <div class="nm-foot">
      <div class="nm-contacts">
        ${contactLinks().filter((c) => c.icon === 'tg' || c.icon === 'phone').map((c) => `<a href="${c.href}">${icon(c.icon)}<span>${c.label.replace('Telegram ', '')}</span></a>`).join('')}
      </div>
      <div class="nm-toggles">
        <button type="button" class="nm-toggle" data-theme-toggle>
          <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          <span>${lang === 'ru' ? 'Тема' : 'Theme'}</span>
        </button>
        <button type="button" class="nm-toggle" data-lang>${t.lang === 'EN' ? 'English' : 'Русский'}</button>
      </div>
    </div>
  </nav>

  <main>
    <section id="hero" class="hero">
      <div class="hero-text">
        <p class="kicker">${t.hero.kicker}</p>
        <h1>${t.hero.title.map((l, i) => `<span class="line"><span${i === 1 ? ' class="mark"' : ''}>${l}</span></span>`).join('')}</h1>
        <p class="lead">${t.hero.lead}</p>
        <div class="cta">
          <a class="btn btn-y" href="#order">${t.hero.cta}</a>
          <a class="btn btn-ghost" href="#cases">${t.hero.cta2}</a>
        </div>
      </div>
      <div class="code-card">
        <div class="code-head"><span></span><span></span><span></span><em>${lang === 'ru' ? 'МодульОбъекта.bsl' : 'ObjectModule.bsl'}</em></div>
        <pre class="bsl" id="bsl"></pre>
      </div>
      <span class="scroll-hint" aria-hidden="true"></span>
    </section>

    ${PAUSE('forklift', t.pauses.forklift)}

    <section id="services" class="sec">
      <div class="sec-head reveal">
        <div><p class="kicker">${t.services.kicker}</p><h2>${t.services.title}</h2></div>
        <div class="rate"><strong>${t.services.rate}</strong><span>${t.services.rateNote}</span></div>
      </div>
      <ol class="svc-list">
        ${t.services.main.map((s, i) => `
          <li class="svc reveal" tabindex="0">
            <span class="svc-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="svc-ico">${icon(s.icon)}</span>
            <h3>${s.title}</h3>
            <div class="svc-more"><p>${s.text}</p></div>
          </li>`).join('')}
      </ol>
      <div class="also-block reveal">
        <h3 class="also-title">${t.services.alsoTitle}</h3>
        <div class="also-grid">
          ${t.services.also.map((s) => `<div class="also"><h4>${s.title}</h4><p>${s.text}</p></div>`).join('')}
        </div>
      </div>
    </section>

    ${PAUSE('tsd', t.pauses.tsd)}

    <section id="cases" class="sec">
      <div class="sec-head reveal"><div><p class="kicker">${t.cases.kicker}</p><h2>${t.cases.title}</h2></div></div>
      <div class="journal reveal">
        <div class="journal-list" role="tablist" aria-label="${esc(t.cases.labels.journal)}">
          <div class="journal-head" aria-hidden="true"><span>${t.cases.labels.num}</span><span>${t.cases.labels.name}</span></div>
          ${t.cases.items.map((c, i) => `
            <button type="button" class="journal-row${i === 0 ? ' on' : ''}" role="tab" aria-selected="${i === 0}" data-case="${i}" data-cursor="${esc(t.nav.open)}">
              <span class="j-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="j-name"><b>${c.title}</b><small>${c.who}</small></span>
            </button>`).join('')}
        </div>
        <div class="case-view" id="case-view" role="tabpanel" aria-live="polite">${casesStatic(t)}</div>
      </div>
    </section>

    ${PAUSE('truck', t.pauses.truck)}

    <section id="process" class="sec">
      <div class="sec-head reveal"><div><p class="kicker">${t.process.kicker}</p><h2>${t.process.title}</h2></div></div>
      <div class="console reveal">
        <div class="console-title"><span></span><span></span><span></span><em>${t.process.console}</em></div>
        <pre class="console-query" id="console-query" data-text="${esc(t.process.query.map(([k, v]) => `${k} ${v}`).join('\n'))}">${esc(t.process.query.map(([k, v]) => `${k} ${v}`).join('\n'))}</pre>
        <div class="console-result">
          <div class="cr-head"><span>${t.process.result}</span><span>${t.process.steps.length}</span></div>
          ${t.process.steps.map((st, i) => `<div class="cr-row"><span class="cr-n">${i + 1}</span><b>${st.title}</b><span class="cr-t">${st.text}</span></div>`).join('')}
        </div>
      </div>
    </section>

    ${PAUSE('server', t.pauses.server)}

    <section id="about" class="sec">
      <p class="kicker reveal">${t.about.kicker}</p>
      <div class="about glass reveal">
        <div>
          <h2>${t.about.title}</h2>
          <div class="founder">
            <span class="founder-mark" aria-hidden="true">${lang === 'ru' ? 'НР' : 'NR'}</span>
            <span><em>${t.about.founderLabel}</em><b>${t.about.founder}</b><small>${t.about.founderRole}</small></span>
          </div>
          ${t.about.text.map((p) => `<p>${p}</p>`).join('')}
        </div>
        <div class="stats">
          ${t.about.stats.map((s) => `<div class="stat"><strong>${s.value}</strong><span>${s.label}</span></div>`).join('')}
        </div>
      </div>
    </section>

    <section id="order" class="sec">
      <p class="kicker reveal">${t.order.kicker}</p>
      <div class="sec-head reveal"><h2 class="final-title">${t.order.title}</h2></div>
      <div class="order-wrap">
        <div class="order reveal" data-number="${number}">
          ${taxiWindow(`${t.order.doc} (${lang === 'ru' ? 'создание' : 'new'})`, `
            <form novalidate>
              <div class="doc-head">
                <div class="field ro"><label for="f-no">${t.order.docNo}</label><input id="f-no" value="${number}" readonly tabindex="-1"></div>
                <div class="field ro"><label for="f-date">${t.order.from}</label><input id="f-date" value="${today}" readonly tabindex="-1"></div>
              </div>
              <div class="field"><label for="f-name">${t.order.fields.name}</label><input id="f-name" name="name" autocomplete="name" placeholder="${esc(t.order.fields.namePh)}"></div>
              <div class="field-row">
                <div class="field"><label for="f-config">${t.order.fields.config}</label><select id="f-config" name="config">${t.order.fields.configs.map((o) => `<option>${o}</option>`).join('')}</select></div>
                <div class="field"><label for="f-kind">${t.order.fields.kind}</label><select id="f-kind" name="kind">${t.order.fields.kinds.map((o) => `<option>${o}</option>`).join('')}</select></div>
              </div>
              <div class="field"><label for="f-task">${t.order.fields.task}</label><textarea id="f-task" name="task" rows="4" placeholder="${esc(t.order.fields.taskPh)}"></textarea></div>
              <div class="field"><label for="f-contact">${t.order.fields.contact}</label><input id="f-contact" name="contact" autocomplete="tel" placeholder="${esc(t.order.fields.contactPh)}"></div>
              <p class="draft-note">${t.order.draftNote}</p>
            </form>
            <div class="messages" hidden><b>${lang === 'ru' ? 'Сообщения:' : 'Messages:'}</b><ul></ul></div>
            <div class="posted" hidden>
              <p class="posted-title">✓ ${t.order.posted}</p>
              <p>${t.order.postedText}</p>
              <pre></pre>
              <div class="send-row">
                <a class="send send-tg" data-send="tg" target="_blank" rel="noopener">${icon('tg')}<span>Telegram</span></a>
                <a class="send send-wa" data-send="wa" target="_blank" rel="noopener">${icon('wa')}<span>WhatsApp</span></a>
                <a class="send send-mail" data-send="mail">${icon('mail')}<span>${t.order.sendMail}</span></a>
              </div>
              <p class="send-hint" hidden>${t.order.copiedHint}</p>
              <button type="button" class="cmd new-order" data-act="new">＋ ${t.order.newOrder}</button>
            </div>
          `, {
            commands: `
              <button type="button" class="cmd cmd-main" data-act="post">${t.order.buttons.post}</button>
              <button type="button" class="cmd" data-act="write">${t.order.buttons.write}</button>
              <button type="button" class="cmd" data-act="post-only">${t.order.buttons.postOnly}</button>`,
          })}
        </div>
        <aside class="contacts glass reveal">
          <h3>${t.order.contactsTitle}</h3>
          ${contactLinks().map((c) => `<a href="${c.href}" ${c.icon === 'github' ? 'target="_blank" rel="noopener"' : ''}>${icon(c.icon)}<span>${c.label}</span></a>`).join('')}
        </aside>
      </div>
    </section>
  </main>

  <footer class="foot">
    <div class="wordmark" aria-hidden="true">BSL<b>amp</b></div>
    <span>© ${new Date().getFullYear()} ${BRAND} · ${t.footer.owner} · ${t.footer.made} · <a href="#credits" class="credits-link" aria-controls="credits" aria-expanded="false">${t.footer.credits}</a></span>
    <a href="#hero">${t.footer.top} ↑</a>
    <p class="credits" id="credits" hidden>${MODEL_CREDITS.map((m) => m.author).join(', ')} (Sketchfab, CC BY 4.0, ${lang === 'ru' ? 'изменены' : 'modified'})</p>
  </footer>`;
}
