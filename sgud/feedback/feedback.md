# w-dwdata-tweqmp 回饋(只增不改;處置結果另記一列並寫明承接哪一列)

| # | 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|---|
| 1 | 2026-11-26 | 自有套件 | w-data-scheduler | 預設 funAdd 略過殘檔時(不拋錯),排程器仍發送 `proc-add-callfun-add` 之 `done`,與同一檔之 `error` 事件並現,對監聽者語意含混,且仍將該新增檔記入任務清單(`otkSrc.set`,對應 `fdTaskCpSrc`),下游依任務清單取用者會收到結果資料夾不存在之新增任務;若認為有誤導須由排程器增加「略過」語意,否則接受現況(本套件已於 README 與 JSDoc 明載,不處理) | `test/unit-badFile.test.mjs` 第 1 案之事件序列;w-data-scheduler 1.0.71 `src/WDataScheduler.mjs:951-977`、`:984-993` |
| 2 | 2026-11-26 | 自有套件 | w-dwdata-ftp | `funBeforeEndNec` 於主階段失敗時仍把本輪全部新下載檔移入儲存區,使 funAdd 拋錯後之其餘完整檔被視為已存在而永久遺失;本套件預設流程已改為略過殘檔以避開,但自訂 funAdd 呼叫 `parseData` 遇殘檔拋錯者仍會遇到;建議失敗輪不移入未處理之新檔(使用端已就下載層另案提出) | Gitea #213 之拋錯實驗;w-dwdata-ftp 1.1.40 `src/WDwdataFtp.mjs:482-529` |
| 3 | 2026-11-26 | 自有套件 | w-ftp、w-dwdata-ftp | 解析層僅能偵測約 99.4% 之隨機位置截斷;截於換行處且已含測站列者(約 0.63%)須於下載層以遠端檔案大小(FTP `SIZE`/SFTP `stat`)核對已下載位元組數,本套件不處理 | `sgud/rule/rulebook.md` R-CHECK-04;`test/unit-checkData.test.mjs` 之全位置掃描 |
| 4 | 2026-11-26 | 自有套件 | w-dwdata-tweqmp | 本套件原無 `sgud/` 與 `CLAUDE.md`,本輪新建 `sgud/` 四類檔(規則帳本、狀態、經驗、回饋),過往歷史經驗未整理;既有 `unit-srLog`、`unit-multi`、`unit-once` 仍將臨時資料夾寫於工作目錄根之 `_` 開頭資料夾,未依測試規範遷至 `test/_tmp/<案名>/`(新增之 `unit-badFile` 已依規範) | `git ls-files \| grep sgud` 無輸出;`test/unit-srLog.test.mjs:105` |
