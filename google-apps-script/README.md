# 共用 Apps Script

`Code.gs` 同時服務入口網站、有向數及代數遊戲。正式操作前，必須先複製目前 Google Sheet 作備份，並先在測試試算表部署及遷移。

部署後支援：

- `GET action=config`
- `GET action=catalog`
- `GET action=profile`
- `GET action=leaderboard`
- `POST action=score`

試算表選單提供「初始化數學遊戲平台」、「開始新排行榜輪次」及「開始新學年」。初始化會保留舊成績，並為舊有向數紀錄補上課題世界、學年及整局統計欄位；舊紀錄無法可靠推算最長連勝及放棄題數，因此兩欄補為 `0`。成績驗證會按「首次答對 × 10 ＋ 重試後答對 × 5」計算，放棄題目不計分。
