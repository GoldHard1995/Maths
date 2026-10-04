# 中一數學方塊世界

香港中一數學課堂鞏固遊戲平台。學生先在入口網站選擇學年、班別及學號，再進入不同課題世界；完成每局十五題後，成績會上傳至共用排行榜，並由後端統一判定襟章。

## 專案

- 根目錄：`有向數方塊世界`，包括數線定位、比較大小、數線移動、拆括號與計算、有向數乘法、有向數除法及四則運算。
- `public/signed-number-line-game`：有向數世界的「數線探險」互動練習，三關共十五題；不計入原有七關的成績、襟章或完成關卡數。
- `algebra-block-world`：`代數方塊世界`，包括文字變代數、代數式加減、乘除、拆括號、四則化簡、公式代入及數列代入。
- `coordinate-block-world`：`坐標方塊世界`，包括讀寫與標示坐標、象限、水平線與鉛垂線、距離、面積、平移、反射及旋轉。
- `identity-block-world`：`恆等式方塊世界`，六關峽谷主題練習；Cloudflare `/identity/`、GitHub Pages `/Maths/identity/`。詳見該子專案的 `README.md`。
- `maths-block-world-hub`：學生入口網站、遊戲選擇及跨遊戲襟章收藏冊。
- `google-apps-script`：各遊戲共用的排行榜、學生進度及襟章後端。

各遊戲每關均有十五題，依五題基礎、五題核心、五題綜合排列。每題首次完成得十分，曾經答錯後完成得五分；時間只供排行榜同分排序，不影響得分或襟章。

## 共用平台

入口網站與各遊戲接駁同一個 Apps Script 網頁應用程式。後端支援：

- 學年、班別及學號設定；
- 各課題世界的關卡排行榜及總榜；
- 整局首次答對、最長首次答對連勝及錯答次數；
- 跨遊戲襟章、累積進度及隱藏襟章；
- 以 `submissionId` 防止重複提交；
- 新排行榜輪次與新學年分開處理。

系統只上傳整局統計，不儲存學生逐題答案。學生身份只保留在目前瀏覽器分頁的 `sessionStorage`，關閉分頁後清除。

Apps Script 的安裝、工作表結構及 API 說明見 `google-apps-script/README.md`。

## 本機開發

三個前端均使用 Node.js 22.13 或更新版本。

```text
# 有向數遊戲，預設 http://localhost:3000/
npm run dev

# 入口網站，預設 http://localhost:3001/
cd maths-block-world-hub && npm run dev

# 代數遊戲，可指定 http://localhost:3002/
cd algebra-block-world && npm run dev -- --port 3002
```

各資料夾的 `.env.example` 列出共用後端及網站網址設定；`.env.local` 不會提交至 GitHub。

## 驗證

```text
npm run lint
npm run build
node --test tests/*.test.mjs
```

入口網站及代數遊戲亦可在各自資料夾執行 `npm test`。背景及襟章均為本專案的原創方塊風格素材，不包含 Minecraft 官方角色、標誌、紋理或介面素材。

## 百分法方塊世界

新增獨立子專案 `percentage-block-world`，包含百分數互化、百分數應用、百分增加、百分減少、盈利與虧蝕及折扣六關。Cloudflare 路徑為 `/percentage/`，GitHub Pages 路徑為 `/Maths/percentage/`。題目採合理生活情境，詳細數值及驗證方式見 [子專案說明](percentage-block-world/README.md)。新增後全平台共 46 關、67 枚襟章；既有已頒發襟章保留。Apps Script 原始碼已加入新世界，線上使用前仍需另行部署更新。
