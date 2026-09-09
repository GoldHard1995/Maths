# 中一數學方塊世界入口

入口網站集中學生身份、兩個獨立遊戲入口及跨遊戲襟章收藏。學生身份只保存在目前分頁的 `sessionStorage`，關閉分頁後清除。

## 本機設定

1. 複製 `.env.example` 為 `.env.local`。
2. 填入共用 Apps Script、兩個獨立遊戲的部署網址。
3. 執行 `npm run dev`；預設使用 `http://localhost:3001/`。

## 安全部署次序

1. 先複製現有排行榜 Google Sheet 作完整備份，並保留舊 Apps Script 部署。
2. 在測試試算表建立 Apps Script，貼上根專案 `google-apps-script/Code.gs`。
3. 在試算表選單執行「初始化數學遊戲平台」。這只會補齊工作表與欄位，不會清除舊有向數紀錄。
4. 建立測試 Web App 部署，權限設為學生可存取，依序測試 `config`、`catalog`、`profile`、`leaderboard` 及 `score`。
5. 把測試部署網址填入三個網站的 `NEXT_PUBLIC_PLATFORM_URL`，把入口網址填入兩個遊戲的 `NEXT_PUBLIC_HUB_URL`。
6. 驗證舊排行榜、重複提交、襟章頒發及新學年隔離後，才把正式試算表的 Apps Script 更新並建立新部署。
7. 保留舊部署網址；如發現問題，可把兩個遊戲的環境變數切回舊網址。

## 資料原則

- 每次只提交整局統計，不提交逐題答案。
- 後端以 `submissionId` 去重，遊戲端不能指定襟章。
- 排行榜輪次與襟章學年分開；開始新排行榜輪次不會清除襟章。
- 第一版只作課堂鼓勵，不適合作正式考核或實物獎勵。

## 襟章素材

`public/badges` 內有 23 枚原創襟章，每枚提供 `128 × 128`、`64 × 64` 及 `48 × 48` PNG。`scripts/build-badges.sh` 可由保留的生成原圖重新建立所有尺寸。
