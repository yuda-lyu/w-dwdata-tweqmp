# w-dwdata-tweqmp 狀態(現況)

> 只記現況,不寫過程(過程見 `sgud/exp/experience.md`).本檔於 2026-11-26 建立(本套件原無 `sgud/`),目前只記錄已盤點之項目.

## 數據檔內容檢測與解析(`checkData`、`parseData`)

- **現況**:`src/checkData.mjs`(預設匯出,不拋錯,回 `{ ok, msg }`)為單一判準;`src/parseData.mjs` 於解析前呼叫之,無效即同步拋 `Error(msg)`,不再回傳 `id` 為 `'Invalid Date'`、錯誤時間或缺站之物件.判準與訊息詞彙見規則帳本 R-CHECK、R-PARSE.
- **對應規則**:R-CHECK-01~05、R-PARSE-01~02.
- **測試**:`test/unit-checkData.test.mjs`(各判準軸逐項、全位置截斷掃描、判定一致、畸形長內容)、`test/unit-parseData.test.mjs`(殘缺內容拋錯、套件自帶真實夾具之截斷掃描);合成內容產生器 `test/lib/genEqContent.mjs`(各欄逐站相異).
- **已知缺口(設計界線,不修)**:
  - 截於換行之後且已含至少 1 筆測站列之殘檔,內容層無法偵測,須下載層(w-ftp、w-dwdata-ftp,另案)以遠端檔案大小核對,或使用端以測站數等氣象署設定面知識判定.
  - 測站列之欄值只要求非空、不含逗號;欄值含 `=`(如 `Stalat==`)時 `checkData` 判有效,而 `parseData` 之 `pv` 以 `=` 切割後取第 2 段(得空值或截斷值).傳輸截斷不會產生此形;不收嚴之理由:無法對真實檔語料全量驗證不誤殺,誤拒完整檔之代價(該檔被略過)高於此形之風險.
- **未改(待裁示)**:`timeRec` 之格式字串 `'YYYY-MM-DD HH-mm:ss'`(時與分之間為連字號)疑為筆誤,主控裁定本輪不改.

## 預設 funAdd／funModify 之殘檔略過(`WDwdataTweqmp`)

- **現況**:預設流程以 `readAndParse` 先讀檔、先檢測,殘缺則略過(不拋錯、不寫出、不動既有結果、不中止本輪),並以 `change` 事件(`type: 'error'`,`event` 為 `proc-add-check-data` 或 `proc-diff-check-data`)、`srLog.error`、`useShowLog` 為 true 時之 console 通知;三通道互相隔離.殘檔隨本輪移入儲存區,下輪遠端檔重新下載且 hash 不同時以 modify 處理而復原.
- **對應規則**:R-DEF-01~04.
- **測試**:`test/unit-badFile.test.mjs`(經本機假 FTP 伺服器 `test/lib/fakeFtpServer.mjs`,port 給 0,不連外部服務).
- **已知缺口(他套件範疇,不在本套件修)**:略過時 funAdd 未拋錯,w-data-scheduler 仍發送 `proc-add-callfun-add` 之 `done`,與 `error` 事件並現,且仍將該新增檔記入任務清單(`fdTaskCpSrc`),下游依任務清單取用者須另依 `type: 'error'` 事件判斷;w-dwdata-ftp 之 `funBeforeEnd` 於主階段失敗時仍移入全部新下載檔.均見 `sgud/feedback/feedback.md`.

## 最近一次驗證

- 2026-11-26:基準版本 1.1.39(`package.json` 未改);依賴 w-dwdata-ftp 1.1.40、wsemi 1.9.78;全套 61 案通過(既有 21、新增 40);詳見該輪修正報告.
