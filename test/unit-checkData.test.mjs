import _ from 'lodash-es'
import assert from 'assert'
import checkData from '../src/checkData.mjs'
import parseData from '../src/parseData.mjs'
import genEqContent from './lib/genEqContent.mjs'


describe('checkData', function() {

    //c0, 合成之完整內容: 3縣市共9筆測站(4,2,3筆), 11欄, LF行尾, 以換行結束
    let c0 = genEqContent()

    //lines0, 供組出各種殘缺內容
    let lines0 = c0.split('\n') //末元素為''(因以換行結束)

    //ok, 檢測有效時之回傳
    let ok = { ok: true, msg: '' }

    //chRepl, U+FFFD取代字元(以碼位指定, 避免原始碼內出現不可見字元)
    let chRepl = String.fromCharCode(0xFFFD)

    //msgs, 固定詞彙訊息
    let msgType = 'invalid c: must be a string'
    let msgNul = 'invalid c: must not contain a NUL character'
    let msgRepl = 'invalid c: must not contain a replacement character'
    let msgTimeLine = 'invalid c: must contain exactly one observation time line'
    let msgTime = 'invalid c.observationTime: must be a date time string YYYY-MM-DD HH:mm:ss'
    let msgNoSta = 'invalid c: must contain at least one station record'
    let msgEol = 'invalid c: must end with a line break'
    let msgSta = (n) => `invalid c.line[${n}]: must be a complete station record`

    it('合成之完整內容須有效', async () => {
        //單值檢測回{ ok, msg }; 有效時msg為空字串
        let r = checkData(c0)
        let rr = ok
        assert.strict.deepEqual(r, rr)
    })

    it('合成內容之各欄值須逐站相異, 確保後續截斷與欄位測試有鑑別力', async () => {
        //自檢測試資料: 每欄之值逐站相異, 否則欄位截斷或錯置之測試不具鑑別力
        let sta = _.filter(lines0, (v) => v.indexOf('Staname=') === 0)
        let r = {
            n: _.size(sta),
            nDistinctPerField: _.map(_.range(11), (i) => {
                return _.size(_.uniq(_.map(sta, (v) => v.split(',')[i])))
            }),
        }
        //震度欄由站序取餘5, 故僅5種相異值, 其餘10欄皆須9種相異值
        let rr = {
            n: 9,
            nDistinctPerField: [9, 9, 9, 9, 5, 9, 9, 9, 9, 9, 9],
        }
        assert.strict.deepEqual(r, rr)
    })

    it('8欄測站列(無PGV)須有效', async () => {
        //使用端提供之真實檔語料(3693檔)內有40檔整檔無PGV三欄(Gitea #213)
        let r = checkData(genEqContent({ withPgv: false }))
        let rr = ok
        assert.strict.deepEqual(r, rr)
    })

    it('CRLF行尾須有效', async () => {
        //使用端提供之真實檔語料內有9檔為CRLF(Gitea #213)
        let r = checkData(genEqContent({ eol: '\r\n' }))
        let rr = ok
        assert.strict.deepEqual(r, rr)
    })

    it('無數據占位字樣之測站列須有效', async () => {
        //使用端提供之真實檔語料內有143檔含'震度-級,PGA(V)=---.---'之測站列(該站無數據)(Gitea #213)
        let c = c0.replace(
            /震度1級,PGA\(V\)= [^,]*,PGA\(NS\)= [^,]*,PGA\(EW\)= [^,]*,PGV\(V\)= [^,]*,PGV\(NS\)= [^,]*,PGV\(EW\)= [^,]*\n/,
            '震度-級,PGA(V)=---.---,PGA(NS)=---.---,PGA(EW)=---.---,PGV(V)=---.---,PGV(NS)=---.---,PGV(EW)=---.---\n',
        )
        assert.ok(c !== c0, '占位字樣之取代須生效')
        let r = checkData(c)
        let rr = ok
        assert.strict.deepEqual(r, rr)
    })

    it('尾端有空白或多餘空行須有效', async () => {
        let r = [
            checkData(c0 + '\n\n'),
            checkData(c0 + '   \r\n  \t'),
            checkData(c0 + '\r'),
        ]
        let rr = [ok, ok, ok]
        assert.strict.deepEqual(r, rr)
    })

    it('各行行首有空白須有效, 且parseData之解析結果與無空白者相同', async () => {
        //parseData逐行trim後判斷, checkData須同判準, 否則有效內容被誤判無測站列
        let c = c0.replace(/^/gm, '  ')
        let r = {
            check: checkData(c),
            same: _.isEqual(parseData(c), parseData(c0)),
        }
        let rr = { check: ok, same: true }
        assert.strict.deepEqual(r, rr)
    })

    it('非字串輸入須回傳失敗且不拋錯', async () => {
        //一般參數必給且須為字串, 非字串(含讀取即拋錯之物件)一律回傳固定之失敗訊息
        let rv = Proxy.revocable({}, {})
        rv.revoke()
        let evil = {
            get toString() {
                throw new Error('x')
            },
            get length() {
                throw new Error('x')
            },
        }
        let vs = [undefined, null, 0, 123, true, {}, [], ['a'], Buffer.from(c0), Object(c0), rv.proxy, evil, Symbol('s'), () => c0]
        let r = _.map(vs, (v) => checkData(v))
        let rr = _.map(vs, () => ({ ok: false, msg: msgType }))
        assert.ok(_.isEqual(r, rr), '非字串輸入須皆回傳固定之失敗訊息')
    })

    it('空內容與只有空白之內容須失敗', async () => {
        let r = _.map(['', '   ', '\n', '\r\n\r\n'], (c) => checkData(c).msg)
        let rr = _.map(_.range(4), () => msgTimeLine)
        assert.strict.deepEqual(r, rr)
    })

    it('含NUL字元須失敗, 含於測站名內亦同', async () => {
        //NUL填充為傳輸中斷或磁碟異常之徵象; 內容其餘結構完整, 僅NUL檢測能擋下
        let c1 = c0.replace('Staname=  測5區', 'Staname=  測5\u0000區')
        assert.ok(c1 !== c0, 'NUL之插入須生效')
        let r = [
            checkData('\u0000'.repeat(32768)).msg,
            checkData(c1).msg,
        ]
        let rr = [msgNul, msgNul]
        assert.strict.deepEqual(r, rr)
    })

    it('含取代字元須失敗, 含於測站名內亦同', async () => {
        //以utf8讀取遇損毀位元組時產生; 內容其餘結構完整, 僅取代字元檢測能擋下
        let c1 = c0.replace('Staname=  測5區', `Staname=  測5${chRepl}區`)
        assert.ok(c1 !== c0, '取代字元之插入須生效')
        let r = checkData(c1).msg
        let rr = msgRepl
        assert.strict.deepEqual(r, rr)
    })

    it('截於多位元組字元中間所致之取代字元須失敗', async () => {
        //以Buffer截斷後再以utf8解碼, 與readFileSync(fp, 'utf8')讀取殘檔之結果相同
        let buf = Buffer.from(c0, 'utf8')
        let i = buf.indexOf(Buffer.from('臺北市'))
        let c = buf.subarray(0, i + 1).toString('utf8') //'臺'為3位元組, 只留首位元組
        assert.ok(c.indexOf(chRepl) >= 0, '殘檔須含取代字元')
        let r = checkData(c).msg
        let rr = msgRepl
        assert.strict.deepEqual(r, rr)
    })

    it('觀測時間行須恰有1行', async () => {
        let c1 = c0.replace('觀測長度(秒)：50', '觀測時間：2021-12-31 16:00:00\n觀測長度(秒)：50') //2行
        let c2 = lines0.filter((v) => v.indexOf('觀測時間：') < 0).join('\n') //0行
        let r = [checkData(c1).msg, checkData(c2).msg]
        let rr = [msgTimeLine, msgTimeLine]
        assert.strict.deepEqual(r, rr)
    })

    it('觀測時間之值須為YYYY-MM-DD HH:mm:ss且為真實存在之日期時間', async () => {
        //截斷與格式錯誤皆須失敗; 需對各種寫法逐一驗證, 原dayjs解析會把部分寫法補成錯誤之時間(如'2021-12-3'→2021-12-03)
        let vs = [
            '', //截於標籤之後
            '2021-12-3', //截於日之中
            '2021-12-31 16:0', //截於分之中
            '2021-12-31 16:00', //無秒
            '2021-12-31 16:00:0', //秒僅1位
            '2021-12-31T16:00:00', //T分隔
            '2021/12/31 16:00:00', //斜線
            '2021-12-31 16:00:00Z', //帶時區
            '2021-12-31 16:00:00.000', //帶毫秒
            '2021-02-31 16:00:00', //2月無31日
            '2021-13-01 16:00:00', //無13月
            '2021-00-10 16:00:00', //無0月
            '2021-12-31 24:00:00', //無24時
            '2021-12-31 16:60:00', //無60分
            '2021-12-31 16:00:60', //無60秒
            'x2021-12-31 16:00:00', //前綴雜字
            '12021-12-31 16:00:00', //年為5位
            'SECRET-TOKEN', //非時間
        ]
        let r = _.map(vs, (t) => checkData(c0.replace('2021-12-31 16:00:00', t)).msg)
        let rr = _.map(vs, () => msgTime)
        assert.strict.deepEqual(r, rr)
    })

    it('觀測時間之標籤與值之間有空白須有效, 且parseData之解析結果與無空白者相同', async () => {
        //parseData對標籤後之值先trim, checkData須同判準, 否則parseData可解析之內容被誤拒
        let c = c0.replace('觀測時間：2021-12-31 16:00:00', '觀測時間：  2021-12-31 16:00:00  ')
        assert.ok(c !== c0, '空白之插入須生效')
        let r = {
            check: checkData(c),
            same: _.isEqual(parseData(c), parseData(c0)),
        }
        let rr = { check: ok, same: true }
        assert.strict.deepEqual(r, rr)
    })

    it('閏年2月29日須有效, 非閏年須失敗', async () => {
        let r = [
            checkData(c0.replace('2021-12-31 16:00:00', '2024-02-29 16:00:00')).ok,
            checkData(c0.replace('2021-12-31 16:00:00', '2023-02-29 16:00:00')).ok,
        ]
        let rr = [true, false]
        assert.strict.deepEqual(r, rr)
    })

    it('無測站列須失敗', async () => {
        //只有表頭, 以換行結束, 其餘檢測皆通過, 僅測站列數檢測能擋下
        let c = lines0.slice(0, 3).join('\n') + '\n'
        let r = checkData(c).msg
        let rr = msgNoSta
        assert.strict.deepEqual(r, rr)
    })

    it('測站列欄位數不為8或11須失敗, 訊息須指出第1個不完整之行號', async () => {
        //c0之第5行(行號自1起算)為第1筆測站列: 1-3行為表頭, 第4行為縣市行
        let iSta = 5
        let fields = lines0[iSta - 1].split(',')
        assert.strict.deepEqual(fields.length, 11, '夾具之測站列須為11欄')

        //kept: 保留前幾欄, 其餘截去
        let kept = (n) => lines0.map((v, i) => (i === iSta - 1 ? fields.slice(0, n).join(',') : v)).join('\n')
        let r = _.map([1, 2, 3, 4, 5, 6, 7, 9, 10], (n) => checkData(kept(n)).msg)
        let rr = _.map(_.range(9), () => msgSta(iSta))
        assert.strict.deepEqual(r, rr)

        //8欄與11欄皆有效
        let r2 = [checkData(kept(8)).ok, checkData(kept(11)).ok]
        let rr2 = [true, true]
        assert.strict.deepEqual(r2, rr2)

        //12欄(多一欄)失敗
        let c12 = lines0.map((v, i) => (i === iSta - 1 ? v + ',PGV(X)= 1.000' : v)).join('\n')
        assert.strict.deepEqual(checkData(c12).msg, msgSta(iSta))
    })

    it('測站列之鍵名順序錯誤或欄值為空須失敗', async () => {
        let iSta = 7
        let fields = lines0[iSta - 1].split(',')
        let rep = (f) => lines0.map((v, i) => (i === iSta - 1 ? f(fields.slice()).join(',') : v)).join('\n')
        let swap = (a) => {
            let t = a[1]
            a[1] = a[2]
            a[2] = t
            return a
        }
        let empty = (k) => (a) => {
            a[k] = a[k].split('=')[0] + '='
            return a
        }
        let r = [
            checkData(rep(swap)).msg, //Stacode與Stalon互換
            checkData(rep(empty(1))).msg, //Stacode為空
            checkData(rep(empty(5))).msg, //PGA(V)為空
            checkData(rep(empty(10))).msg, //PGV(EW)為空
            checkData(rep((a) => {
                a[4] = '震度'
                return a
            })).msg, //震度無值
        ]
        let rr = _.map(_.range(5), () => msgSta(iSta))
        assert.strict.deepEqual(r, rr)
    })

    it('測站列各欄之鍵名拼錯須失敗(逐欄, 前綴多字與末字改錯兩種)', async () => {
        //鍵名為固定詞彙; 第0欄(Staname)為測站列之判定依據, 拼錯則該行不屬測站列, 不在此列
        let iSta = 6
        let fields = lines0[iSta - 1].split(',')
        let mk = (k, f) => {
            let a = fields.slice()
            a[k] = f(a[k])
            return lines0.map((v, i) => (i === iSta - 1 ? a.join(',') : v)).join('\n')
        }
        let r = []
        for (let k = 1; k <= 10; k++) {
            if (k === 4) {
                //震度欄無等號, 以'震度'二字為鍵
                r.push(checkData(mk(k, (s) => s.replace('震度', '震x'))).msg)
                r.push(checkData(mk(k, (s) => s.replace('震度', 'x度'))).msg)
            }
            else {
                r.push(checkData(mk(k, (s) => 'X' + s)).msg) //於鍵名前加字
                r.push(checkData(mk(k, (s) => s.replace(/.=/, 'x='))).msg) //鍵名末字改錯
            }
        }
        let rr = _.map(_.range(20), () => msgSta(iSta))
        assert.strict.deepEqual(r, rr)
    })

    it('Staname=不在行首之行不視為測站列, 與parseData一致', async () => {
        //parseData以行首8字元判斷測站列; 行中出現Staname=之備註行不得被當成不完整之測站列
        let c = c0.replace('觀測長度(秒)：50', '備註:Staname=abc\n觀測長度(秒)：50')
        assert.ok(c !== c0, '備註行之插入須生效')
        let r = {
            check: checkData(c),
            same: _.isEqual(parseData(c), parseData(c0)),
        }
        let rr = { check: ok, same: true }
        assert.strict.deepEqual(r, rr)
    })

    it('以Staname=起始但為縣市行(結尾>>)或觀測長度行者不視為測站列, 與parseData之分類順序一致', async () => {
        //parseData對各行依序判斷: 觀測時間行 -> 觀測長度行 -> 縣市行(結尾>>) -> 測站列; checkData須同序, 否則兩者對同一行之認定分歧
        //插入之兩行位於真正之觀測長度行與縣市行之前, 其效果被其後之真正行覆蓋, 故parseData之結果與無插入者相同
        let c = c0
            .replace('觀測長度(秒)：50', 'Staname=xyz,觀測長度(秒)：5\n觀測長度(秒)：50')
            .replace('臺北市 >>', 'Staname=abc >>\n臺北市 >>')
        assert.ok(c.split('\n').length === c0.split('\n').length + 2, '兩行之插入須生效')
        let r = {
            check: checkData(c),
            same: _.isEqual(parseData(c), parseData(c0)),
        }
        let rr = { check: ok, same: true }
        assert.strict.deepEqual(r, rr)
    })

    it('多筆測站列不完整時須指出第1筆之行號', async () => {
        //c0之測站列位於第5至8行(臺北市)、第10至11行(新北市)、第13至15行(連江縣); 令第10與第13行不完整
        let c = lines0.map((v, i) => (i === 9 || i === 12 ? v.split(',').slice(0, 5).join(',') : v)).join('\n')
        let r = checkData(c).msg
        let rr = msgSta(10)
        assert.strict.deepEqual(r, rr)
    })

    it('整行完整但未以換行結束須失敗', async () => {
        //傳輸中斷恰截於最末行之行尾與換行之間; 各行結構皆完整, 僅尾端換行檢測能擋下
        let r = [
            checkData(c0.replace(/\n$/, '')).msg,
            checkData(c0.replace(/\n$/, '') + '  ').msg,
        ]
        let rr = [msgEol, msgEol]
        assert.strict.deepEqual(r, rr)
    })

    it('錯誤訊息不得回顯內容', async () => {
        //訊息以位置與期望定位, 不寫出內容之值
        let secret = 'SECRET-TOKEN-9f3a'
        let cs = [
            c0.replace('2021-12-31 16:00:00', secret), //時間格式錯
            c0.replace(/Staname= {2}測5區,[^\n]*\n/, `Staname=${secret}\n`), //測站列不完整
            c0.replace('Staname=  測5區', `Staname=${secret}\u0000`), //NUL
            `${secret}\n`, //無觀測時間
            c0.replace(/\n$/, secret), //未以換行結束
        ]
        let r = _.map(cs, (c) => {
            let m = checkData(c).msg
            return { fail: m !== '', echo: m.indexOf('SECRET') >= 0 || m.indexOf('9f3a') >= 0 }
        })
        let rr = _.map(cs, () => ({ fail: true, echo: false }))
        assert.strict.deepEqual(r, rr)
    })

    it('截斷檢測之全位置掃描: 僅截於換行之後且已含測站列者有效, 其餘須失敗', async () => {
        //殘缺內容須可辨識; 同時明載界線: 截於換行處之內容與完整檔結構相同, 內容層無法偵測
        //oracle: 截斷長度p之內容有效, 若且唯若 p>0 且第p-1個字元為換行 且 前p個字元內已含Staname=起始行
        let r = []
        let rr = []
        let nOk = 0
        for (let p = 0; p < c0.length; p++) {
            let c = c0.slice(0, p)
            let exp = p > 0 && c0[p - 1] === '\n' && c.split('\n').some((v) => v.indexOf('Staname=') === 0)
            if (exp) {
                nOk++
            }
            r.push(checkData(c).ok)
            rr.push(exp)
        }
        assert.strict.deepEqual(r, rr)

        //前提: 掃描範圍內確有被接受與被拒絕之截斷位置
        assert.ok(nOk > 0 && nOk < c0.length, '全位置掃描須同時含有效與無效之截斷位置')
    })

    it('checkData與parseData判定須一致: 有效者可解析, 無效者parseData拋出相同訊息', async () => {
        //R: parseData之前置檢測即checkData, 兩者不得分歧
        let cs = [
            c0,
            genEqContent({ withPgv: false }),
            '',
            '觀測時間：2021-12-3',
            c0.replace(/\n$/, ''),
            lines0.slice(0, 3).join('\n') + '\n',
            c0.slice(0, 200),
            '\u0000'.repeat(100),
        ]
        let r = _.map(cs, (c) => {
            let ck = checkData(c)
            let msg = ''
            try {
                parseData(c)
            }
            catch (err) {
                msg = err.message
            }
            return { ok: ck.ok, same: msg === ck.msg }
        })
        let rr = _.map([true, true, false, false, false, false, false, false], (b) => ({ ok: b, same: true }))
        assert.strict.deepEqual(r, rr)
    })

    it('超長之畸形內容須於合理時間內完成檢測', async () => {
        //防範正規式回溯: 長空白串、長逗號串、長無逗號串; 線性實作僅需數十毫秒, 二次方回溯之實作於此長度需數十秒, 故以耗時上限5秒斷言(mocha之timeout為180秒, 不足以擋下退化)
        let long = 300000
        let cs = [
            c0 + ' '.repeat(long) + 'x',
            c0 + '\n' + ' '.repeat(long),
            c0 + 'Staname=' + ' ,'.repeat(long),
            c0 + 'Staname=' + 'a'.repeat(long),
            c0 + 'Staname=' + ','.repeat(long),
            '觀測時間：' + ' '.repeat(long),
        ]
        let t0 = Date.now()
        let r = _.map(cs, (c) => checkData(c).ok)
        let ms = Date.now() - t0
        let rr = [false, true, false, false, false, false]
        assert.strict.deepEqual(r, rr)
        assert.ok(ms < 5000, '長度30萬之畸形內容須於5秒內完成檢測')
    })

    it('觀測時間加8小時後年份須仍為4位數, 以使parseData之id為14位數字', async () => {
        //parseData將UTC+0之觀測時間加8小時; 9999-12-31 16:00:00起加後為5位數年份, 修前與僅檢查日曆之實作皆得id為'Invalid Date'
        let mk = (t) => c0.replace('2021-12-31 16:00:00', t)
        let ts = ['9999-12-31 15:59:59', '9999-12-31 16:00:00', '9999-12-31 23:59:59']
        let r = _.map(ts, (t) => {
            let c = mk(t)
            let ck = checkData(c)
            let id = ck.ok ? parseData(c).id : ''
            return { ok: ck.ok, msg: ck.msg, idIs14Digits: ck.ok ? /^\d{14}$/.test(id) : null }
        })
        let rr = [
            { ok: true, msg: '', idIs14Digits: true },
            { ok: false, msg: msgTime, idIs14Digits: null },
            { ok: false, msg: msgTime, idIs14Digits: null },
        ]
        assert.strict.deepEqual(r, rr)
    })

})
