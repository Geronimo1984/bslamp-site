// Печать BSL-кода в первом экране с подсветкой синтаксиса как в конфигураторе.

const CODE = {
  ru: `Процедура ВзятьЗадачу(Задача) Экспорт

	Если НЕ Задача.ЕстьТЗ Тогда
		Задача.ТЗ = СобратьТребования(Задача);
	КонецЕсли;

	Решение = Разработать(Задача, СтандартыИТС);
	Протестировать(Решение, КопияБазы);
	Внедрить(Решение);

	Сообщить("Готово. Без велосипедов.");

КонецПроцедуры`,
  en: `Procedure TakeTask(Task) Export

	If NOT Task.HasSpec Then
		Task.Spec = GatherRequirements(Task);
	EndIf;

	Solution = Develop(Task, Standards1C);
	Test(Solution, DatabaseCopy);
	Deploy(Solution);

	Message("Done. No reinventing the wheel.");

EndProcedure`,
};

const KEYWORDS = /^(Процедура|КонецПроцедуры|Экспорт|Если|Тогда|КонецЕсли|НЕ|Новый|ВЫБРАТЬ|ИЗ|ГДЕ|Пока|Цикл|КонецЦикла|Procedure|EndProcedure|Export|If|Then|EndIf|NOT|New|SELECT|FROM|WHERE|While|Do|EndDo)$/;

function highlight(line) {
  // комментарий // … до конца строки — отдельным цветом, как в конфигураторе
  const ci = line.indexOf('//');
  if (ci >= 0) return highlight(line.slice(0, ci)) + `<span class="b-cm">${line.slice(ci).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;
  const out = [];
  const re = /("[^"]*"?)|([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    const [tok, str, word] = m;
    const safe = tok.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    if (str) out.push(`<span class="b-str">${safe}</span>`);
    else if (word && KEYWORDS.test(word)) out.push(`<span class="b-kw">${safe}</span>`);
    else if (word && line[re.lastIndex] === '(') out.push(`<span class="b-fn">${safe}</span>`);
    else if (tok === '&' && /^&[A-Za-zА-Яа-я]/.test(line.slice(m.index))) out.push('<span class="b-kw">&amp;</span>');
    else if (/[();=.,]/.test(tok)) out.push(`<span class="b-op">${safe}</span>`);
    else out.push(safe);
  }
  return out.join('');
}

export function typeBsl(el, lang, instant) {
  const text = CODE[lang];
  const render = (count, caret = true) => {
    const lines = text.slice(0, count).split('\n');
    el.innerHTML = lines
      .map((ln, i) => `<span class="b-ln">${i + 1}</span>${highlight(ln)}${caret && i === lines.length - 1 ? '<span class="b-caret"></span>' : ''}`)
      .join('\n');
  };

  if (el._timer) clearInterval(el._timer);
  if (instant) {
    render(text.length);
    return;
  }
  let n = 0;
  el._timer = setInterval(() => {
    n += text[n] === '\t' ? 1 : 2;
    render(n);
    if (n >= text.length) clearInterval(el._timer);
  }, 28);
}

// готовый фрагмент кода с номерами строк и подсветкой (без печати) — для окон в главах
// compact: телефон — без выравнивающих пробелов (при переносе строк они выглядят криво)
export function bslHtml(code, compact = matchMedia('(max-width: 1020px)').matches) {
  return code.split('\n').map((ln, i) => `<span class="b-line"><span class="b-ln">${i + 1}</span>${highlight(compact ? ln.replace(/ {2,}/g, ' ') : ln)}</span>`).join('');
}
