// Сколько глав прочитано — только в этом браузере (localStorage), на сервер ничего не уходит.
// Пишет движок (engine/main.js) по мере прокрутки, читает страница манги (manga.js).
// Ключ — путь главы: animanga:read:/blackjack/ → { p: доля 0…1, t: когда читали }.
const KEY = 'animanga:read:';

export const chapterPath = (path) => path.replace(/index\.html$/, '');

export function readProgress(path) {
  try {
    const value = JSON.parse(localStorage.getItem(KEY + chapterPath(path)));
    return typeof value?.p === 'number' ? value : null;
  } catch {
    return null;   // приватный режим или запрещённое хранилище — просто без прогресса
  }
}

export function saveProgress(path, p) {
  try {
    localStorage.setItem(KEY + chapterPath(path), JSON.stringify({ p: Math.round(p * 1000) / 1000, t: Date.now() }));
  } catch {}
}
