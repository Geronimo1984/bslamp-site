// Предотрисовка для поисковиков: вписывает готовую разметку страницы (русская версия) в dist/index.html.
// В браузере скрипт сразу перерисовывает то же самое и оживляет; Яндекс и Google видят весь текст без JS.
import { readFileSync, writeFileSync } from 'node:fs';
import { TEXT } from './src/content.js';
import { appMarkup } from './src/markup.js';

const file = 'dist/index.html';
const html = readFileSync(file, 'utf8');
const markup = appMarkup(TEXT.ru, 'ru', { number: 'BSL-000000', today: '' });
const out = html.replace('<div id="app"></div>', `<div id="app">${markup}</div>`);
if (out === html) throw new Error('Не нашёл <div id="app"></div> в dist/index.html');
writeFileSync(file, out);
console.log(`prerender: ${Math.round(markup.length / 1024)} КБ разметки вписано в ${file}`);
