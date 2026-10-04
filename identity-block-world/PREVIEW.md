# Cloudflare Preview 發佈

目前來源已整合至 GitHub new-update；恆等式世界移除「恆等式辨識」及「恆等式綜合應用」後，平台包含 8 個世界、50 關及 73 枚可取得襟章。Apps Script 正式版本 17 已同步更新目錄，更新前成績及襟章原始紀錄保留。以下歷史發佈紀錄保留當時的版本資訊。

- 日期：2026-10-04。
- Preview：https://new-update-maths-static-site.kenk950503.workers.dev/。
- 新遊戲：https://new-update-maths-static-site.kenk950503.workers.dev/identity/。
- Worker 版本：cf83f9a8-f7f0-48d9-b779-2a3000ce8328。
- 原有內容基準：已發佈版本 dd4f2266-d250-4107-96aa-8f902862513b，包含百分法，共 7 個世界。七個世界的入口及主要資產雜湊已逐一與固定版本核對。
- 依 Ken 確認保留全部 Preview 內容，使用既有 `_site` 資產組合新遊戲及 Hub 卡，再以 `wrangler versions upload --config wrangler.jsonc --assets /tmp/identity-preserved-preview/_site --preview-alias new-update` 上傳；未部署正式流量。
- 發佈包含 8 個世界、52 關。原有遊戲內容保留；Cloudflare 的各項根目錄設定及 GitHub Pages 流程維持。
- GitHub new-update 尚未包含原有百分法的未提交來源，因此本次採用直接上傳版本，避免分支建置移除已發佈遊戲。未推送原工作目錄的未提交修改。後續從 GitHub 建置前，須先整合百分法及這個恆等式工作分支。
- 正式 Apps Script 尚未登記恆等式。新課題的成績上傳、排行榜、襟章及個人最佳紀錄須另行更新後端才能生效。

## 線上驗證

- 指定浮動 Preview 網址的 Hub、八個遊戲入口及主要資產均回傳 HTTP 200，雜湊與發佈資產一致。
- Chrome 已驗證 Hub → 恆等式 → 題目 → Hub，學生身份保留，百分法卡仍在。
- 1024 × 768、1180 × 820、1366 × 1024 均無水平溢位或 KaTeX 錯誤。
- 檢查過程封鎖 POST，未提交任何正式學生成績。
- 本機線上驗證截圖：`/tmp/identity-live-qa/`。
- 隔離工作分支：`codex/identity-canyon-preview`。

## 完整來源整合修正

其他坐標更新曾把共用 Preview 覆蓋成只含 6 個世界。現已保留最新坐標來源 d58bea4，合併百分法及恆等式，將完整來源推送至 GitHub new-update（943d3a7）。後續分支建置包含 8 個世界、52 關及 75 枚襟章，不再僅依靠手動組合的未提交資產。原工作目錄的其他未提交修改維持不變。

- 恢復 Preview 版本：37dd93b2-b6f4-419b-ae35-6adb1df9c28d。
- 共用系統 44 項測試、百分法 11 項測試、Hub 身份測試及 lint 通過；完整 Cloudflare 建置通過。
- 原有遊戲程式及 Cloudflare 根目錄設定未變更。新增子專案的 Tailwind 掃描會產生新的共用 utility CSS 資產雜湊。
- 正式 Apps Script 仍未更新。
