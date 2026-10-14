# Эксперимент «9 точек» (PhD)

Статический сайт: `index.html` + `experiment.js` + `style.css`. Все библиотеки и шрифты лежат в `vendor/`, интернет для запуска не нужен (только для отправки данных в DataPipe).

## Онлайн (GitHub Pages)

1. Загрузите содержимое папки в репозиторий (вместе с `vendor/` и файлом `.nojekyll`).
2. Settings → Pages → Deploy from a branch → `main` / `(root)`.
3. Ничего собирать не нужно.

Если Pages публикуется через GitHub Actions (Settings → Pages → Source: GitHub Actions), workflow должен выполнять `npm run build` и публиковать папку `dist/`.

## Оффлайн (Node.js)

```
npm run dev          # или: node server.js / npm start
```

Откройте http://localhost:3000. `npm install` не требуется. Перед запуском удалите старую папку `node_modules`, если она осталась от прошлой версии.

Если интернета нет или отправлять данные не нужно, откройте http://localhost:3000/?offline (параметр `?offline` работает и на GitHub Pages). Результаты тогда скачиваются вручную: клавиша **E** на финальном экране → «Экспорт CSV» / «Скачать JSON» / «Скачать Схему (PNG)».

## Отправка данных (DataPipe → Google Drive)

- ID эксперимента: `DATAPIPE_EXPERIMENT_ID` в начале `experiment.js`.
- После каждой попытки на DataPipe уходит картинка `<ID>_trialNN.png`, после опроса — `<ID>.csv`.
- На финальном экране участник видит, сохранились ли данные.

В панели DataPipe (pipe.jspsych.org) для эксперимента должны быть включены:
- **Enable data collection** — для CSV;
- **Enable base64 data collection** — для картинок;
- **Data validation** — выключена (CSV разделён точкой с запятой).

## Клавиши

- **F** — полноэкранный режим, **Y** — панель настроек (debug), **R** — стереть линию / следующая попытка, **T** — досрочно завершить задачу, **E** — экспорт на финальном экране.

## Если меняете оформление

Стили Tailwind собраны в `tailwind.css`. После добавления новых Tailwind-классов пересоберите его:

```
npm install
npm run build:css
```
