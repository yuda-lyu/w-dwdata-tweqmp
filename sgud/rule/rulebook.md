# w-dwdata-tweqmp 規則帳本(藍圖)

本檔為套件之規則帳本,記程式碼須長成什麼樣、盤點指令與對應測試;現況與已知缺口見 `sgud/state/state.md`.規則列為「未做/部分」者是預期功能,不是死碼.

套件定位:基於檔案下載台灣氣象署 FTP 地震 PGA 數據(`*-townshipInt-All.txt`)並解析為 JSON 之任務建構器(`WDwdataTweqmp`),及其解析函數 `parseData` 與內容檢測函數 `checkData`.

## R-CHECK 內容檢測(`src/checkData.mjs`)

| 規則 | 內容 | 狀態 | 測試 |
|---|---|---|---|
| R-CHECK-01 | `checkData(c)` 不拋錯,回傳 `{ ok, msg }`;有效時 `msg` 為 `''`,無效時為固定詞彙(V19 格式 `invalid <名稱>: must …`,英文小寫,V20 不回顯內容,只帶位置如 `c.line[n]`) | 已做 | `test/unit-checkData.test.mjs` |
| R-CHECK-02 | 有效內容須同時符合:①為字串且不含 NUL 與 U+FFFD;②恰 1 行「觀測時間：」,其值嚴格為 `YYYY-MM-DD HH:mm:ss` 且為真實存在之日期時間(不依賴 dayjs 之寬鬆解析;`parseData` 將 UTC+0 之觀測時間加 8 小時,加後須仍為 4 位數年份,使 id 為 14 位數字);③每一以 `Staname=` 起始之測站列(逐行 trim 後,依 `parseData` 同序分類:觀測時間行、觀測長度行、縣市行〔結尾 `>>`〕、測站列)須為 8 欄(Staname、Stacode、Stalon、Stalat、震度、PGA(V)、PGA(NS)、PGA(EW))或 11 欄(另加 PGV 三向),鍵名與順序固定,各欄值非空,不限數值格式;④至少 1 筆測站列;⑤內容去除尾端空格、tab、CR 後以換行結束 | 已做 | 同上 |
| R-CHECK-03 | 判準只取使用端提供之真實檔語料(3693 檔,Gitea #213)之共同結構;**不**檢查測站數、縣市、末站、表頭文字、觀測長度(氣象署設定面之值,日後變更會誤拒完整檔);**不**提供放寬或保留舊行為之 opt | 已做 | `test/unit-checkData.test.mjs`(各軸逐項) |
| R-CHECK-04 | 內容層之已知界線:截於換行之後且已含至少 1 筆測站列者與完整檔結構相同,無法偵測(約 0.63% 之隨機截斷位置),須於下載層以遠端檔案大小核對,或由使用端以氣象署設定面之知識判定;此界線以測試明載,不以放寬判準掩蓋 | 已做(界線明載) | `test/unit-checkData.test.mjs` 之全位置掃描、`test/unit-parseData.test.mjs` |
| R-CHECK-05 | 對長空白串、長逗號串、長無逗號串之畸形內容不得有二次方回溯(尾端換行以逐字元自尾端檢查,測站列正規式各欄以互斥字元類界定) | 已做 | `test/unit-checkData.test.mjs` 之超長內容案 |

盤點:`git grep -n "checkData" -- src test`.

## R-PARSE 解析(`src/parseData.mjs`)

| 規則 | 內容 | 狀態 | 測試 |
|---|---|---|---|
| R-PARSE-01 | `parseData(c)` 於解析前先 `checkData(c)`,無效即同步 `throw new Error(r.msg)`(先於任何解析),與 `checkData` 之判定與訊息一致;不回傳 `id` 為 `'Invalid Date'`、錯誤時間或缺站之物件 | 已做 | `test/unit-parseData.test.mjs`、`test/unit-checkData.test.mjs`(判定一致案) |
| R-PARSE-02 | 完整內容之輸出與舊版逐位相同(含 8 欄、CRLF、無數據占位字樣之內容);`timeRec` 之格式字串(`'YYYY-MM-DD HH-mm:ss'`)本規則範圍內**不改** | 已做 | `test/unit-parseData.test.mjs` |

## R-DEF 預設 funAdd／funModify(`src/WDwdataTweqmp.mjs`)

| 規則 | 內容 | 狀態 | 測試 |
|---|---|---|---|
| R-DEF-01 | 預設 funAdd／funModify 先讀檔、先 `checkData`,通過才動結果資料夾(檢測先於副作用,dspec〈輸入參數之檢測機制〉V17):不通過時不建立、不清空、不備份任何資料夾,不寫出任何檔 | 已做 | `test/unit-badFile.test.mjs` |
| R-DEF-02 | 不通過時**略過、不拋錯、不中止本輪**:拋錯會使 w-data-scheduler 設 `msgExit` 而取消其後項目,且 w-dwdata-ftp 於結束前仍把本輪全部新下載檔移入儲存區,其後之完整檔永久遺失 | 已做 | 同上 |
| R-DEF-03 | 略過以三個通道通知,內容同一物件 `{ event, id, msg }`:`change` 事件(`type: 'error'`)、`srLog.error`、`useShowLog` 為 true 時 console 一行;`event` 於新增路徑為 `proc-add-check-data`、變更路徑為 `proc-diff-check-data`;`msg` 為 `checkData` 之固定詞彙;三通道互相隔離,任一通道失效(同步拋錯、回傳被 reject 之 Promise、未提供)不得影響略過與其餘通道 | 已做 | 同上 |
| R-DEF-04 | 自訂 funAdd／funModify 呼叫 `parseData` 遇殘缺內容會拋錯並中止本輪其餘檔案(w-dwdata-ftp 之流程),須使用者自行 try-catch 或先 `checkData`;README 與 JSDoc 明載;不提供保留舊行為之 opt(自有套件不做向後相容) | 已做(文件) | — |

盤點:`git grep -n "readAndParse\|logSkip" -- src`;各自訂路徑之預設值見 `WDwdataTweqmp` 之 `funAddDef`、`funModifyDef`.

## R-DOC 文件

| 規則 | 內容 | 狀態 |
|---|---|---|
| R-DOC-01 | 行為變更(`parseData` 改為拋錯、預設流程略過殘檔、新增 `checkData`)須於 README 與 JSDoc 明載;公開庫之程式、測試、`sgud/`、README、註解不得寫使用端專案名與本機路徑,需求出處寫「使用端」與 Gitea 編號 | 已做 |
