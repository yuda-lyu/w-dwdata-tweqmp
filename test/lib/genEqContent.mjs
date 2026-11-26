/**
 * 依氣象署地震PGA數據檔(*-townshipInt-All.txt)之結構產生合成內容，供測試使用
 *
 * 各測站之欄位值逐站相異且各欄相異(代碼、經緯度、PGA三向、PGV三向皆由站序導出)，各縣市測站數不等，
 * 使搬移、截斷、重新編號類錯誤不致因值相同而被掩蓋
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.time='2021-12-31 16:00:00'] 輸入觀測時間字串，預設'2021-12-31 16:00:00'
 * @param {Integer} [opt.duration=50] 輸入觀測長度(秒)正整數，預設50
 * @param {Array} [opt.counties] 輸入縣市陣列，各元素為{ name, n }，n為該縣市測站數，預設為3個縣市，測站數各為4、2、3
 * @param {Boolean} [opt.withPgv=true] 輸入測站列是否含PGV三向(11欄)，false時為8欄，預設true
 * @param {String} [opt.eol='\n'] 輸入行尾字串，預設'\n'
 * @param {Boolean} [opt.endWithEol=true] 輸入內容是否以行尾結束，預設true
 * @param {Integer} [opt.base=0] 輸入站序起始偏移正整數，使不同檔案之測站值相異，預設0
 * @returns {String} 回傳合成內容字串
 */
let genEqContent = (opt = {}) => {
    let time = opt.time || '2021-12-31 16:00:00'
    let duration = opt.duration || 50
    let counties = opt.counties || [{ name: '臺北市', n: 4 }, { name: '新北市', n: 2 }, { name: '連江縣', n: 3 }]
    let withPgv = opt.withPgv !== false
    let eol = opt.eol || '\n'
    let endWithEol = opt.endWithEol !== false
    let base = opt.base || 0

    let ls = []
    ls.push('全國>> 震度顯示>>')
    ls.push(`觀測時間：${time}`)
    ls.push(`觀測長度(秒)：${duration}`)

    let k = base
    for (let county of counties) {
        ls.push(`${county.name} >>`)
        for (let j = 0; j < county.n; j++) {
            k++
            let s = `Staname=  測${k}區`
            s += `,Stacode=T${String(100 + k)}`
            s += `,Stalon=${(119 + k * 0.013).toFixed(3)}`
            s += `,Stalat=${(21 + k * 0.011).toFixed(3)}`
            s += `,震度${k % 5}級`
            s += `,PGA(V)= ${(k * 10 + 1.1).toFixed(1)}`
            s += `,PGA(NS)= ${(k * 10 + 2.2).toFixed(1)}`
            s += `,PGA(EW)= ${(k * 10 + 3.3).toFixed(1)}`
            if (withPgv) {
                s += `,PGV(V)= ${(k * 0.1 + 0.01).toFixed(3)}`
                s += `,PGV(NS)= ${(k * 0.1 + 0.02).toFixed(3)}`
                s += `,PGV(EW)= ${(k * 0.1 + 0.03).toFixed(3)}`
            }
            ls.push(s)
        }
    }

    let c = ls.join(eol)
    if (endWithEol) {
        c += eol
    }
    return c
}


export default genEqContent
