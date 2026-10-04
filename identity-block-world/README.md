# 恆等式方塊世界

以 GitHub main 8394bee3 的多項式方塊世界為介面基準，提供六關中一恆等式練習。每關 15 題，5 基礎、5 核心、5 綜合；首次正確 10 分、重試 5 分、綜合題可放棄。

## 本機驗證

`npm test`、`npm run lint`、`npm run build:github`。從專案根目錄執行 `npm run build:cloudflare`，全站資產輸出至 `_site`。

Cloudflare 路徑 `/identity/`；GitHub Pages 路徑 `/Maths/identity/`；所有讀取及上傳固定使用 `worldId: identity`。

分數以「分數」鍵建立分子及分母。題目、選項及答案預覽均使用真正上下分數。分數計算採精確有理數；展開答案須合併同類項。

逾時局不上傳、不計襟章。上一局題目按學年、學生及關卡保存在同一分頁的 sessionStorage。

## 本機完整試玩

先從根目錄執行 `npm run build:cloudflare`，再於此子專案執行 `npm run preview:local`，開啟 `http://127.0.0.1:8766/`。

此預覽使用同一份 Code.gs 的記憶體模擬成績、排行榜及襟章，重啟後清除；不會連接正式 Apps Script。

## 發佈前

須經另行批准，才更新共用 Apps Script 的 Code.gs，以及推送或部署。新世界上傳在後端目錄更新後才會有效。原有資料表及欄位維持不變；完美主義者當前門檻改為 37 關，歷史取得紀錄保留。
