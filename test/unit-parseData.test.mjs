import fs from 'fs'
import _ from 'lodash-es'
import assert from 'assert'
import parseData from '../src/parseData.mjs'


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
