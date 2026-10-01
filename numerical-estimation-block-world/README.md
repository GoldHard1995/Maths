# 數值估算方塊世界

香港中一數值估算練習網頁遊戲。UI 直接沿用「多項式方塊世界」，並採用獨立的 `worldId = numerical-estimation`。

## 關卡

每關固定十五題，依次為五題基礎、五題核心及五題綜合。

- 位值探索
- 近似值工坊
- 有效數字偵察
- 有效數字鍛造
- 估算補給站
- 沙漠估算遠征

題目涵蓋位值、近似值、有效數字、算式估算及生活情境，不設負數、科學記數法或誤差界限。所有題目數值不超過 50,000，最多使用 6 位小數；近似值可直接以 `0.001` 表示精度。數值答案以十進制字串判定，保留有效數字所需的末位零；位值探索的指定數字在同一數串中只出現一次。

## 本機檢查

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build:github`

GitHub Pages 路徑為 `/Maths/numerical-estimation/`。排行榜及襟章使用共用 Google Apps Script，並以 `worldId + gameId` 隔離紀錄。
