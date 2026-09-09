const SETTINGS_SHEET = '設定';
const RECORDS_SHEET = '成績紀錄';
const SPREADSHEET_ID = '1xStb4PmteX7iACLcHxVZXBUBl6pK6Ipf7ayC3Pll7Bs';
const CLASSES = ['1A', '1B', '1C', '1D'];
const GAMES = ['locate', 'compare', 'move', 'brackets', 'multiply', 'divide', 'mixed'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('排行榜管理')
    .addItem('建立排行榜工作表', 'setupLeaderboard')
    .addItem('開始新一輪', 'startNewRound')
    .addToUi();
}

function setupLeaderboard() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  let settings = spreadsheet.getSheetByName(SETTINGS_SHEET);
  if (!settings) settings = spreadsheet.insertSheet(SETTINGS_SHEET);
  settings.clear();
  const now = new Date();
  settings.getRange('A1:B6').setValues([
    ['設定項目', '內容'],
    ['目前輪次', Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss')],
    ['輪次名稱', '有向數排行榜'],
    ['建立時間', now],
    ['允許班別', CLASSES.join(',')],
    ['學號範圍', '1-33'],
  ]);
  settings.setFrozenRows(1);
  settings.getRange('A1:B1').setBackground('#294f38').setFontColor('#ffffff').setFontWeight('bold');
  settings.setColumnWidth(1, 130);
  settings.setColumnWidth(2, 240);
  let records = spreadsheet.getSheetByName(RECORDS_SHEET);
  if (!records) records = spreadsheet.insertSheet(RECORDS_SHEET);
  if (records.getLastRow() === 0) {
    records.getRange(1, 1, 1, 9).setValues([['輪次', '提交編號', '提交時間', '班別', '學號', '遊戲', '分數', '滿分', '遊戲秒數']]);
    records.setFrozenRows(1);
    records.getRange(1, 1, 1, 9).setBackground('#294f38').setFontColor('#ffffff').setFontWeight('bold');
    records.setColumnWidths(1, 9, 120);
    records.setColumnWidth(2, 280);
    records.setColumnWidth(3, 170);
  }
  const hasOpenTrigger = ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === 'onOpen');
  if (!hasOpenTrigger) ScriptApp.newTrigger('onOpen').forSpreadsheet(SPREADSHEET_ID).onOpen().create();
}

function startNewRound() {
  const spreadsheet = getSpreadsheet_();
  const settings = spreadsheet.getSheetByName(SETTINGS_SHEET);
  if (!settings) throw new Error('請先執行「建立排行榜工作表」。');
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('開始新一輪', '輸入新輪次名稱：', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const now = new Date();
  settings.getRange('B2:B4').setValues([
    [Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss')],
    [response.getResponseText().trim() || '有向數排行榜'],
    [now],
  ]);
  ui.alert('新一輪已開始。舊成績仍保留在「成績紀錄」。');
}

function doGet(e) {
  const callback = String(e.parameter.callback || 'callback');
  if (!/^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  try {
    const board = String(e.parameter.board || 'locate');
    const classFilter = String(e.parameter.classFilter || 'ALL');
    const student = validStudent_(e.parameter.className, Number(e.parameter.studentNo))
      ? { className: String(e.parameter.className), studentNo: Number(e.parameter.studentNo) }
      : null;
    return jsonp_(callback, leaderboard_(board, classFilter, student));
  } catch (error) {
    return jsonp_(callback, { ok: false, message: error.message });
  }
}

function doPost(e) {
  const submissionId = String(e.parameter.submissionId || '');
  try {
    const payload = {
      submissionId,
      className: String(e.parameter.className || ''),
      studentNo: Number(e.parameter.studentNo),
      gameId: String(e.parameter.gameId || ''),
      score: Number(e.parameter.score),
      maxScore: Number(e.parameter.maxScore),
      elapsedSeconds: Number(e.parameter.elapsedSeconds),
    };
    validateSubmission_(payload);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      appendIfNew_(payload);
    } finally {
      lock.releaseLock();
    }
    const identity = { className: payload.className, studentNo: payload.studentNo };
    const grade = leaderboard_(payload.gameId, 'ALL', identity);
    const classBoard = leaderboard_(payload.gameId, payload.className, identity);
    return postMessage_({
      source: 'directed-number-leaderboard',
      ok: true,
      submissionId,
      message: '成績已成功上傳。',
      best: grade.self,
      gradeRank: grade.self ? grade.self.rank : null,
      classRank: classBoard.self ? classBoard.self.rank : null,
    });
  } catch (error) {
    return postMessage_({ source: 'directed-number-leaderboard', ok: false, submissionId, message: error.message });
  }
}

function validateSubmission_(payload) {
  if (!/^[A-Za-z0-9-]{10,80}$/.test(payload.submissionId)) throw new Error('提交編號無效。');
  if (!validStudent_(payload.className, payload.studentNo)) throw new Error('班別或學號無效。');
  if (GAMES.indexOf(payload.gameId) === -1) throw new Error('遊戲類別無效。');
  if (!Number.isFinite(payload.score) || !Number.isFinite(payload.maxScore) || !Number.isFinite(payload.elapsedSeconds)) throw new Error('成績格式無效。');
}

function appendIfNew_(payload) {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(RECORDS_SHEET);
  if (!sheet) throw new Error('排行榜尚未完成設定。');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
    if (ids.indexOf(payload.submissionId) !== -1) return;
  }
  sheet.appendRow([currentRound_(), payload.submissionId, new Date(), payload.className, payload.studentNo, payload.gameId, payload.score, payload.maxScore, payload.elapsedSeconds]);
}

function leaderboard_(board, classFilter, student) {
  if (GAMES.indexOf(board) === -1 && board !== 'overall') throw new Error('排行榜類別無效。');
  if (classFilter !== 'ALL' && CLASSES.indexOf(classFilter) === -1) throw new Error('班別篩選無效。');
  const roundId = currentRound_();
  const records = readRecords_().filter(row => row.roundId === roundId);
  const bestByGame = {};
  records.forEach(row => {
    const key = `${row.className}:${row.studentNo}:${row.gameId}`;
    if (!bestByGame[key] || better_(row, bestByGame[key])) bestByGame[key] = row;
  });
  let entries;
  if (board === 'overall') {
    const students = {};
    Object.values(bestByGame).forEach(row => {
      const key = `${row.className}:${row.studentNo}`;
      if (!students[key]) students[key] = [];
      students[key].push(row);
    });
    entries = Object.values(students).filter(rows => GAMES.every(game => rows.some(row => row.gameId === game))).map(rows => ({
      className: rows[0].className,
      studentNo: rows[0].studentNo,
      score: rows.reduce((sum, row) => sum + row.score, 0),
      maxScore: rows.reduce((sum, row) => sum + row.maxScore, 0),
      elapsedSeconds: rows.reduce((sum, row) => sum + row.elapsedSeconds, 0),
      submittedAt: Math.max.apply(null, rows.map(row => row.submittedAt)),
    }));
  } else {
    entries = Object.values(bestByGame).filter(row => row.gameId === board);
  }
  if (classFilter !== 'ALL') entries = entries.filter(row => row.className === classFilter);
  entries.sort(compare_);
  const ranked = entries.map((entry, index) => ({
    rank: index + 1,
    className: entry.className,
    studentNo: entry.studentNo,
    score: entry.score,
    maxScore: entry.maxScore,
    elapsedSeconds: entry.elapsedSeconds,
  }));
  const self = student ? ranked.find(row => row.className === student.className && row.studentNo === student.studentNo) || null : null;
  return { ok: true, roundId, board, classFilter, rankings: ranked.slice(0, 10), self };
}

function readRecords_() {
  const sheet = getSpreadsheet_().getSheetByName(RECORDS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues().map(row => ({
    roundId: String(row[0]),
    submissionId: String(row[1]),
    submittedAt: new Date(row[2]).getTime(),
    className: String(row[3]),
    studentNo: Number(row[4]),
    gameId: String(row[5]),
    score: Number(row[6]),
    maxScore: Number(row[7]),
    elapsedSeconds: Number(row[8]),
  }));
}

function better_(left, right) {
  return left.score > right.score || (left.score === right.score && (left.elapsedSeconds < right.elapsedSeconds || (left.elapsedSeconds === right.elapsedSeconds && left.submittedAt < right.submittedAt)));
}

function compare_(left, right) {
  return right.score - left.score || left.elapsedSeconds - right.elapsedSeconds || left.submittedAt - right.submittedAt || left.className.localeCompare(right.className) || left.studentNo - right.studentNo;
}

function validStudent_(className, studentNo) {
  return CLASSES.indexOf(String(className)) !== -1 && Number.isInteger(studentNo) && studentNo >= 1 && studentNo <= 33;
}

function currentRound_() {
  const sheet = getSpreadsheet_().getSheetByName(SETTINGS_SHEET);
  if (!sheet) throw new Error('排行榜尚未完成設定。');
  return String(sheet.getRange('B2').getDisplayValue());
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SPREADSHEET_ID;
  return SpreadsheetApp.openById(id);
}

function jsonp_(callback, payload) {
  return ContentService.createTextOutput(`${callback}(${JSON.stringify(payload).replace(/</g, '\\u003c')});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function postMessage_(payload) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput(`<script>window.top.postMessage(${json}, '*');</script>`).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
