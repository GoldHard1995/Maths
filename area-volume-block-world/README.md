# 面積與體積方塊世界

香港中一面積、均勻截面及角柱體練習網頁遊戲。UI 直接沿用「多項式方塊世界」，並採用獨立的 `worldId = area-volume`。

## 關卡

每關固定十五題。均勻截面為七題基礎及八題核心；其餘關卡為五題基礎、五題核心及五題綜合。

- 面積、分割與填補
- 均勻截面
- 角柱體體積
- 總表面面積

題目以響應式 SVG 顯示平面及立體圖形，所有計算結果均為正整數。

## 本機檢查

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build:github`

GitHub Pages 路徑為 `/Maths/area-volume/`。排行榜及襟章使用共用 Google Apps Script，並以 `worldId + gameId` 隔離紀錄。
