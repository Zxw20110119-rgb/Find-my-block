/* GitHub Pages keeps timetables on this device; the hosted app provides accounts. */
(function () {
  let storageFailed = false;
  function render() {
    $('accountTitle').textContent = text('课表存储', 'Timetable storage');
    $('accountIdentity').textContent = text('此版本将课表保存在当前浏览器。', 'This version saves your timetable in this browser.');
    $('cloudStatus').textContent = storageFailed
      ? text('保存失败。请检查浏览器是否允许本地存储。', 'Could not save. Check that browser storage is allowed.')
      : text('需要 Google 登录与账号同步时，请打开主站。', 'Open the main site for Google sign-in and account sync.');
    for (const id of ['googleButton', 'signOut', 'saveToAccount', 'reloadCloud']) $(id).hidden = true;
    $('hostedAccountLink').textContent = text('打开主站', 'Open main site');
    $('privacyLink').textContent = text('隐私与数据', 'Privacy and data');
    $('icsFile').disabled = false;
    $('calendarHelp').textContent = text(
      '导入 Apple Calendar 或 Google Calendar 导出的 .ics 文件。课表保存在此设备，下次使用同一浏览器会自动读取。根据上一节与下一节课自动设置路线；当天第一节课只设置终点。',
      'Import an .ics file from Apple Calendar or Google Calendar. Your timetable is kept on this device and restored in the same browser. Routes use your previous and next class. The first class keeps your starting point.'
    );
  }
  async function save(snapshot) {
    const eventsSaved = saveLocal('fmb-calendar-v1', snapshot.events);
    const roomsSaved = saveLocal('fmb-rooms-v1', snapshot.roomMappings);
    storageFailed = !eventsSaved || !roomsSaved;
    render();
    return !storageFailed;
  }
  window.TimetableAccount = { save, render };
  render();
})();
