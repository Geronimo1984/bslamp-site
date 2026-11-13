// Форма заявки в виде документа 1С: «Записать» — черновик, «Провести» — проверка и кнопки отправки.
// Сайт данные никуда не отправляет: клиент сам пишет в Telegram, WhatsApp или на почту с готовым текстом.
import { CONTACTS } from './content.js';

const DRAFT_KEY = 'order-draft';

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}
function writeDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); return true; } catch { return false; }
}

export function docNumber() {
  const n = String(Math.floor(Date.now() / 1000) % 1000000).padStart(6, '0');
  return `BSL-${n}`;
}

export function initOrder(root, t, lang) {
  const form = root.querySelector('form');
  const msgs = root.querySelector('.messages');
  const done = root.querySelector('.posted');
  const title = root.querySelector('.win-title-text');
  const fields = ['name', 'config', 'kind', 'task', 'contact'];
  const required = ['name', 'task', 'contact'];

  const draft = readDraft();
  if (draft) fields.forEach((f) => { if (draft[f] && form.elements[f]) form.elements[f].value = draft[f]; });

  const collect = () => Object.fromEntries(fields.map((f) => [f, form.elements[f].value.trim()]));

  function showMessages(list) {
    msgs.hidden = list.length === 0;
    msgs.querySelector('ul').innerHTML = list.map((m) => `<li>${m}</li>`).join('');
  }

  function validate() {
    const data = collect();
    const errors = [];
    required.forEach((f) => {
      const wrap = form.elements[f].closest('.field');
      const empty = !data[f];
      wrap.classList.toggle('invalid', empty);
      if (empty) errors.push(`${t.required}: «${wrap.querySelector('label').textContent}»`);
    });
    showMessages(errors);
    if (errors.length) form.elements[required.find((f) => !data[f])].focus();
    return errors.length ? null : data;
  }

  form.addEventListener('input', (e) => {
    const wrap = e.target.closest('.field');
    if (wrap && e.target.value.trim()) wrap.classList.remove('invalid');
  });

  root.querySelector('[data-act="write"]').addEventListener('click', () => {
    const ok = writeDraft(collect());
    showMessages([]);
    flash(root.querySelector('[data-act="write"]'), ok ? t.saved : t.required);
  });

  const post = async () => {
    const data = validate();
    if (!data) return;
    writeDraft(data);
    const number = root.dataset.number;
    const text = leadText(data, t, number);
    root.classList.add('is-posted');
    title.textContent = `${t.doc} ${number} — ${t.posted}`;
    done.hidden = false;
    done.querySelector('pre').textContent = text;
    const links = sendLinks(text, `${t.doc} ${number}`);
    done.querySelector('[data-send="tg"]').href = links.tg;
    done.querySelector('[data-send="wa"]').href = links.wa;
    done.querySelector('[data-send="mail"]').href = links.mail;
    // Telegram подставляет текст не везде (компьютер, старые версии) — копируем его заодно
    done.querySelector('[data-send="tg"]').onclick = () => {
      navigator.clipboard?.writeText(text).then(() => { done.querySelector('.send-hint').hidden = false; }).catch(() => {});
    };
    done.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  root.querySelector('[data-act="post"]').addEventListener('click', post);
  root.querySelector('[data-act="post-only"]').addEventListener('click', post);
  form.addEventListener('submit', (e) => { e.preventDefault(); post(); });
}

function leadText(d, t, number) {
  return [
    `${t.doc} ${number}`,
    `${t.fields.name}: ${d.name}`,
    `${t.fields.config}: ${d.config}`,
    `${t.fields.kind}: ${d.kind}`,
    `${t.fields.task}: ${d.task}`,
    `${t.fields.contact}: ${d.contact}`,
  ].join('\n');
}

function sendLinks(text, subject) {
  const enc = encodeURIComponent;
  const phone = CONTACTS.phoneHref.replace(/\D/g, '');
  return {
    tg: `https://t.me/${CONTACTS.telegram}?text=${enc(text)}`,
    wa: `https://wa.me/${phone}?text=${enc(text)}`,
    mail: `mailto:${CONTACTS.email}?subject=${enc(subject)}&body=${enc(text)}`,
  };
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1400);
}

export function contactLinks() {
  const links = [];
  if (CONTACTS.telegram) links.push({ href: `https://t.me/${CONTACTS.telegram}`, label: `Telegram @${CONTACTS.telegram}`, icon: 'tg' });
  links.push({ href: CONTACTS.phoneHref, label: CONTACTS.phone, icon: 'phone' });
  links.push({ href: `mailto:${CONTACTS.email}`, label: CONTACTS.email, icon: 'mail' });
  links.push({ href: CONTACTS.github, label: 'GitHub', icon: 'github' });
  return links;
}
