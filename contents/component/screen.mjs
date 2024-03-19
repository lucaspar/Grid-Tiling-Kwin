import { shared } from 'shared.mjs';
import { calc, clampDivider, config } from 'config.mjs';
import { List } from 'list.mjs';

export function Screen() {
  const lists = [];
  const dividers = [];

  function count() {
    return lists.reduce((n, l) => n + l.windows.length, 0);
  }

  function nminimizedWindows() {
    return lists.reduce((n, l) => n + l.nminimized(), 0);
  }

  function nminimized() {
    // not total number of minimized windows in screen
    return lists.reduce((n, l) => n + l.minimized(), 0);
  }

  function addList(index) {
    if (lists.some((l) => l.minSpace() > 1 / (lists.length + 1)))
      // check if adding a new line won't decrease the size of the clients inside any of the existing lines below their minSpace
      return;

    const l = List();
    if (index === undefined) {
      lists.push(l);
      if (lists.length > 1) dividers.push(0);
    } else {
      lists.splice(index, 0, l);
      if (lists.length > 1) dividers.splice(index, 0, 0);
    }
    return l;
  }

  function removeLine(index) {
    lists.splice(index, 1);
    if (index === 0) {
      if (dividers.length > 0) dividers.shift();
    } else {
      dividers.splice(index - 1, 1);
    }
  }

  function smallest() {
    if (lists.length) {
      let i = 0;
      let minSpace = list[i].minSpace();
      for (const [j, l] of lists.slice(1).entries()) {
        const m = l.minSpace();
        if (m < minSpace) {
          i = j;
          minSpace = m;
        }
      }
      return i;
    }
  }

  function add(window, grid) {
    const i = smallest();
    let list = lists[i];
    if (
      list &&
      list.minSpace() + window.minSpace <= 1 / lists.length &&
      list.windows.length < grid[0] &&
      (lists.length >= grid[1] || lists.length > list.windows.length)
    ) {
      if (list.add(window)) {
        window.listIndex = i;
        return window;
      }
    } else if (window.minSpace <= 1 / (lists.length + 1) && lists.length < grid[1]) {
      list = addList();
      if (list && list.add(window)) {
        window.listIndex = lists.length - 1;
        return window;
      }
    }
  }

  function remove(window) {
    const list = lists[window.listIndex];
    if (list.remove(window)) {
      if (!list.windows.length) removeLine(window.listIndex);
      return true;
    }
  }

  function swapList(amount, listIndex) {
    const i = listIndex + amount;
    if (i >= 0 && i < lists.length) {
      const line = lists[listIndex];
      lists[listIndex] = lists[i];
      lists[i] = line;
      return line;
    }
  }

  function move(window, amount) {
    const max = config.grid[screenIndex][desktopIndex];

    let i = window.listIndex + amount;
    while (
      i >= 0 &&
      i < lists.length &&
      (lists[i].minSpace() + window.minSpace > 1 / lists.length || lists[i].windows.length >= max[0])
    )
      i += amount;

    if (i >= 0 && i < lists.length) {
      remove(window);
      lists[i].add(window);
      window.listIndex = i;
      return window;
    } else if (lists.length < max[1]) {
      const j = amount < 0 ? 0 : lists.length;
      const list = addList(j);
      if (list) {
        remove(window);
        list.add(window);
        window.listIndex = j;
        return window;
      }
    }
  }

  function changeDividerAfter(amount, listIndex) {
    if (listIndex < lists.length - 1) dividers[listIndex] = clampDivider(dividers[listIndex] + amount);
  }

  function changeDividerBefore(amount, listIndex) {
    if (listIndex > 0) dividers[listIndex - 1] = clampDivider(dividers[listIndex - 1] - amount);
  }

  function changeDivider(amount, listIndex) {
    changeDividerAfter(amount, listIndex);
    changeDividerBefore(amount, listIndex);
  }

  function render(screenIndex, desktopIndex, activityId) {
    const area = shared.workspace.clientArea(0, screenIndex, desktopIndex + 1);
    print('area', area); //TODO
    const width = config.width(area.width, lists.length - nminimized());

    let x = calc.x(area.x);
    let current = 0;
    let previous = 0;
    for (let [i, line] of lists.entries()) {
      if (line.minimized()) continue;

      const divider = i === lists.length - 1 || (i < lists.length - 1 && lists[i + 1].minimized()) ? 0 : dividers[i];

      current = width * divider;
      const w = -previous + width + current;

      line.render(x, w, area.y, area.height, i, screenIndex, desktopIndex, activityId);

      x += w + config.gap;
      previous = current;
    }
  }

  return { lists, count, add, remove, move, render };
}
