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

const KEYWORDS = /^(Процедура|КонецПроцедуры|Экспорт|Если|Тогда|КонецЕсли|НЕ|Procedure|EndProcedure|Export|If|Then|EndIf|NOT)$/;

function highlight(line) {
  const out = [];
  const re = /("[^"]*"?)|([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    const [tok, str, word] = m;
    const safe = tok.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    if (str) out.push(`<span class="b-str">${safe}</span>`);
    else if (word && KEYWORDS.test(word)) out.push(`<span class="b-kw">${safe}</span>`);
    else if (word && line[re.lastIndex] === '(') out.push(`<span class="b-fn">${safe}</span>`);
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
