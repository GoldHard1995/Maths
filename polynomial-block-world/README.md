# 多項式方塊世界

香港中一多項式練習網頁遊戲。UI 直接沿用「代數方塊世界」，並採用獨立的 `worldId = polynomial`。

## 關卡

每關固定十五題，依次為五題基礎、五題核心及五題綜合。

- 指數律
- 多項式辨識
- 多項式排列
- 同類項
- 多項式加減
- 多項式乘法

題目涵蓋正整數指數律、多項式概念、加減及乘法，不設零指數、負指數、求值或多項式除法。直接輸入題接受數學上等值的多項式寫法；指定排列形式的題目會另行檢查升冪或降冪。

## 本機檢查

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build:github`

GitHub Pages 路徑為 `/Maths/polynomial/`。排行榜及襟章使用共用 Google Apps Script，並以 `worldId + gameId` 隔離紀錄。
