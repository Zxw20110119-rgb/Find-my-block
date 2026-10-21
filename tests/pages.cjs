const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const adapter = fs.readFileSync(path.join(root, 'account.js'), 'utf8');

test('Pages resources and privacy links work beneath a repository subpath', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
    const url = match[1];
    if (/^(?:https?:|data:)/.test(url)) continue;
    assert.ok(!url.startsWith('/'), 'Root-relative resource: ' + url);
    assert.ok(fs.existsSync(path.join(root, url)), 'Missing resource: ' + url);
  }
  assert.ok(fs.existsSync(path.join(root, '.nojekyll')));
  assert.match(html, /id="hostedAccountLink"/);
  assert.match(fs.readFileSync(path.join(root, 'privacy.html'), 'utf8'), /href="\.\/"/);
});

test('Pages restores a saved timetable across visits without an account API', async () => {
  const local = new Map();
  const start = (language = 'en', failStorage = false) => {
    const elements = {};
    const context = vm.createContext({
      window: {},
      $: id => elements[id] ||= {},
      text: (zh, en) => language === 'zh' ? zh : en,
      fetch() { throw new Error('Static Pages must not call an account API'); },
      saveLocal(key, value) {
        if (failStorage) return false;
        local.set(key, JSON.stringify(value)); return true;
      },
    });
    vm.runInContext(adapter, context);
    return { account: context.window.TimetableAccount, elements };
  };
  const timetable = { events: [{ id: 'lesson-1', location: 'R8' }], roomMappings: { R8: 'rakipaoa' } };
  const first = start();
  assert.equal(await first.account.save(timetable), true);
  const second = start();
  assert.deepEqual(JSON.parse(local.get('fmb-calendar-v1')), timetable.events);
  assert.deepEqual(JSON.parse(local.get('fmb-rooms-v1')), timetable.roomMappings);
  assert.equal(second.elements.icsFile.disabled, false);
  assert.equal(second.elements.googleButton.hidden, true);
  assert.match(second.elements.cloudStatus.textContent, /main site/);
  assert.equal(start('zh').elements.hostedAccountLink.textContent, '打开主站');
  const blocked = start('en', true);
  assert.equal(await blocked.account.save(timetable), false);
  assert.match(blocked.elements.cloudStatus.textContent, /Could not save/);
  assert.deepEqual(JSON.parse(local.get('fmb-calendar-v1')), timetable.events);
  assert.equal(await second.account.save({ events: [], roomMappings: {} }), true);
  assert.deepEqual(JSON.parse(local.get('fmb-calendar-v1')), []);
});
