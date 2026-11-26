import fs from 'fs'
import _ from 'lodash-es'
import assert from 'assert'
import parseData from '../src/parseData.mjs'
import genEqContent from './lib/genEqContent.mjs'


describe('parseData', function() {

    //c0, 觀測時間2021-12-31 16:00:00, 共356筆測站數據
    let c0 = fs.readFileSync(`./test/100000-townshipInt-All.txt`, 'utf8')

    //c1, 觀測時間2021-12-31 17:00:00, 共356筆測站數據
    let c1 = fs.readFileSync(`./test/100001-townshipInt-All.txt`, 'utf8')

    it('觀測時間為UTC+0須加8小時, 並以戳記時間timeTag為id', async () => {
        let eq = parseData(c0)

        //time尾端時區位移由執行環境時區決定, 故僅比對時間本體與位移格式
        let r = {
            ..._.omit(eq, ['data', 'time']),
            time: eq.time.replace(/[+-]\d{2}:\d{2}$/, ''),
            timeOffsetFormat: /[+-]\d{2}:\d{2}$/.test(eq.time),
        }
        let rr = {
            id: '20220101000000',
            time: '2022-01-01T00:00:00', //觀測時間2021-12-31 16:00:00加8小時
            timeRec: '2022-01-01 00-00:00',
            timeTag: '20220101000000',
            duration: '50',
            timeOffsetFormat: true,
        }
        assert.strict.deepEqual(r, rr)
    })

    it('不同觀測時間須解析為不同id', async () => {
        let eq0 = parseData(c0)
        let eq1 = parseData(c1)
        let r = [eq0.id, eq1.id]
        let rr = ['20220101000000', '20220101010000']
        assert.strict.deepEqual(r, rr)
    })

    it('須解析檔內全部測站數據', async () => {
        let eq = parseData(c0)
        let r = _.size(eq.data)
        let rr = 356 //檔內Staname=起始行數
        assert.strict.deepEqual(r, rr)
    })

    it('測站數據須含代碼經緯度震度與PGA, 並由所屬縣市行組出county與town', async () => {
        let eq = parseData(c0)

        //第1筆, 位於'臺北市 >>'行之後
        //Staname=  北投區,Stacode=A002,Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 313.0,PGA(NS)= 313.6,PGA(EW)= 313.6,PGV(V)= -1.000,PGV(NS)= -1.000,PGV(EW)= -1.000
        let r = _.head(eq.data)
        let rr = {
            code: 'A002',
            lng: 121.467,
            lat: 25.126,
            cintensity: '0級',
            intensity: 0,
            'PGA(Z)': 313,
            'PGA(N-S)': 313.6,
            'PGA(E-W)': 313.6,
            PGA: 313.6,
            county: '臺北市',
            town: '臺北市北投區',
        }
        assert.strict.deepEqual(r, rr)
    })

    it('縣市須隨檔內各縣市行切換', async () => {
        let eq = parseData(c0)

        //最末筆, 位於'連江縣 >>'行之後
        //Staname=  南竿鄉,Stacode= MSU,Stalon=119.923,Stalat=26.169,震度0級,PGA(V)= 313.6,PGA(NS)= 313.6,PGA(EW)= 313.6,PGV(V)= -1.000,PGV(NS)= -1.000,PGV(EW)= -1.000
        let r = _.last(eq.data)
        let rr = {
            code: 'MSU',
            lng: 119.923,
            lat: 26.169,
            cintensity: '0級',
            intensity: 0,
            'PGA(Z)': 313.6,
            'PGA(N-S)': 313.6,
            'PGA(E-W)': 313.6,
            PGA: 313.6,
            county: '連江縣',
            town: '連江縣南竿鄉',
        }
        assert.strict.deepEqual(r, rr)
    })

    it('震度須同時給出原字串cintensity與數值intensity', async () => {
        let eq = parseData(c0)

        //Staname=  汐止區,Stacode=A125,...,震度1級,...
        let dt = _.find(eq.data, { code: 'A125' })
        let r = _.pick(dt, ['town', 'cintensity', 'intensity'])
        let rr = {
            town: '新北市汐止區',
            cintensity: '1級',
            intensity: 1,
        }
        assert.strict.deepEqual(r, rr)
    })

    it('PGA須取水平雙向最大值, 不受垂直向影響', async () => {

        //c, 將北投區改為垂直向最大, 水平向NS大於EW
        let c = c1.replace(
            `Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 235.44,PGA(NS)= 235.44,PGA(EW)= 235.44`,
            `Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 225.99,PGA(NS)= 215.85,PGA(EW)= 202.53`,
        )

        let eq = parseData(c)
        let dt = _.find(eq.data, { code: 'A002' })
        let r = _.pick(dt, ['PGA(Z)', 'PGA(N-S)', 'PGA(E-W)', 'PGA'])
        let rr = {
            'PGA(Z)': 225.99,
            'PGA(N-S)': 215.85,
            'PGA(E-W)': 202.53,
            PGA: 215.85, //取PGA(N-S)與PGA(E-W)之最大值
        }
        assert.strict.deepEqual(r, rr)
    })

    it('PGV為無效值-1不納入測站數據', async () => {
        let eq = parseData(c0)
        let dt = _.head(eq.data)
        let r = _.filter(_.keys(dt), (k) => {
            return _.includes(k, 'PGV')
        })
        let rr = []
        assert.strict.deepEqual(r, rr)
    })

})


describe('parseData: 殘缺內容須拋錯', function() {

    //cs, 合成之完整內容: 3縣市共9筆測站, 觀測時間2021-12-31 16:00:00(UTC+0), 解析後id為20220101000000
    let cs = genEqContent()
    let lines = cs.split('\n')

    //msgs
    let msgTimeLine = 'invalid c: must contain exactly one observation time line'
    let msgTime = 'invalid c.observationTime: must be a date time string YYYY-MM-DD HH:mm:ss'

    //pm, 取parseData結果之id或拋錯訊息
    let pm = (c) => {
        try {
            return parseData(c).id
        }
        catch (err) {
            return `THROW ${err.message}`
        }
    }

    it('傳輸中斷之殘檔須拋錯, 不得回傳id為Invalid Date或錯誤時間之物件', async () => {
        //觀測重現: 修前此類輸入回傳id為'Invalid Date'(使用端以eq.id為檔名即寫出Invalid Date.json)或錯誤時間之id
        let iTime = cs.indexOf('觀測時間：')
        let r = {
            empty: pm(''), //0位元組
            line1: pm(lines[0] + '\n'), //只到第1行
            labelOnly: pm(cs.slice(0, iTime + '觀測時間：'.length)), //截於標籤之後
            nul: pm('\u0000'.repeat(32768)), //NUL填充
            timeMid: pm(cs.slice(0, iTime + '觀測時間：2021-12-3'.length)), //截於日之中, 修前被dayjs補成2021-12-03而得錯誤id
            noSta: pm(lines.slice(0, 3).join('\n') + '\n'), //無測站列
            lastLineCut: pm(cs.slice(0, cs.lastIndexOf(',PGV(EW)'))), //截於最末測站列之中(第15行缺最後1欄)
            noEol: pm(cs.replace(/\n$/, '')), //各行完整但最後換行遺失
        }
        let rr = {
            empty: `THROW ${msgTimeLine}`,
            line1: `THROW ${msgTimeLine}`,
            labelOnly: `THROW ${msgTime}`,
            nul: 'THROW invalid c: must not contain a NUL character',
            timeMid: `THROW ${msgTime}`,
            noSta: 'THROW invalid c: must contain at least one station record',
            lastLineCut: 'THROW invalid c.line[15]: must be a complete station record',
            noEol: 'THROW invalid c: must end with a line break',
        }
        assert.strict.deepEqual(r, rr)
    })

    it('非字串輸入須拋錯', async () => {
        //一般參數必給且須為字串
        let r = [undefined, null, 123, {}, Buffer.from(cs)].map(pm)
        let rr = [0, 1, 2, 3, 4].map(() => 'THROW invalid c: must be a string')
        assert.strict.deepEqual(r, rr)
    })

    it('完整內容之id為戳記時間, 且與修前一致', async () => {
        //觀測時間2021-12-31 16:00:00加8小時
        let r = pm(cs)
        let rr = '20220101000000'
        assert.strict.deepEqual(r, rr)
    })

    it('8欄測站列(無PGV)與CRLF行尾之完整內容須可解析且結果與LF相同', async () => {
        //使用端提供之真實檔語料(Gitea #213)內有40檔整檔無PGV三欄, 9檔為CRLF; 兩者皆須如修前可解析
        let eqLf = parseData(genEqContent({ withPgv: false }))
        let eqCrlf = parseData(genEqContent({ withPgv: false, eol: '\r\n' }))
        let r = { n: _.size(eqLf.data), same: _.isEqual(eqLf, eqCrlf), id: eqLf.id }
        let rr = { n: 9, same: true, id: '20220101000000' }
        assert.strict.deepEqual(r, rr)
    })

    it('無數據占位列(震度-級, 各值為---.---)之完整內容須可解析, 結果與修前相同', async () => {
        //使用端提供之真實檔語料(Gitea #213)內有143檔含此類測站列(該站無數據); 期望值取自修前版本對同一內容之輸出(占位字串原樣保留, 水平向最大PGA為空)
        let c = cs.replace(
            /震度1級,PGA\(V\)= [^,]*,PGA\(NS\)= [^,]*,PGA\(EW\)= [^,]*,PGV\(V\)= [^,]*,PGV\(NS\)= [^,]*,PGV\(EW\)= [^,]*\n/,
            '震度-級,PGA(V)=---.---,PGA(NS)=---.---,PGA(EW)=---.---,PGV(V)=---.---,PGV(NS)=---.---,PGV(EW)=---.---\n',
        )
        assert.ok(c !== cs, '占位字樣之取代須生效')
        let eq = parseData(c)
        let r = { 'id': eq.id, 'n': _.size(eq.data), 'first': _.head(eq.data) }
        let rr = {
            'id': '20220101000000',
            'n': 9,
            'first': {
                'code': 'T101',
                'lng': 119.013,
                'lat': 21.011,
                'cintensity': '-級',
                'intensity': '',
                'PGA(Z)': '---.---',
                'PGA(N-S)': '---.---',
                'PGA(E-W)': '---.---',
                'PGA': '',
                'county': '臺北市',
                'town': '臺北市測1區',
            },
        }
        assert.strict.deepEqual(r, rr)
    })

    it('截於換行處且已含測站列之內容無法於解析層偵測, 視為完整內容(須於下載層以檔案大小核對)', async () => {
        //界線: 與完整檔結構相同, 結果僅測站數較少; 此為已知限制, 見checkData之JSDoc
        let c = lines.slice(0, 7).join('\n') + '\n' //表頭3行+縣市行+3筆測站列
        let eq = parseData(c)
        let r = { id: eq.id, n: _.size(eq.data) }
        let rr = { id: '20220101000000', n: 3 }
        assert.strict.deepEqual(r, rr)
    })

    it('套件自帶之真實檔夾具須可解析, 且各截斷於非換行處之位置皆須拋錯', async () => {
        //夾具為完整真實檔(356筆測站); 於各位元組位置(步進97)截斷後以utf8解碼, 非換行處者須拋錯(與readFileSync(fp, 'utf8')讀取殘檔之結果相同)
        let buf = fs.readFileSync('./test/100000-townshipInt-All.txt')
        let n = 0
        let nThrow = 0
        let bad = []
        for (let p = 1; p < buf.length; p += 97) {
            if (buf[p - 1] === 10) {
                continue //截於換行之後者與完整檔結構相同, 不在此測
            }
            n++
            let c = buf.subarray(0, p).toString('utf8')
            let b = false
            try {
                parseData(c)
            }
            catch (err) {
                b = true
            }
            if (b) {
                nThrow++
            }
            else {
                bad.push(p)
            }
        }
        assert.ok(n > 100 && nThrow === n, `非換行處之截斷皆須拋錯, 未拋錯之位置: ${bad.slice(0, 10).join(',')}`)
    })

})
