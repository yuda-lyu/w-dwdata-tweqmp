import get from 'lodash-es/get.js'
import each from 'lodash-es/each.js'
import trim from 'lodash-es/trim.js'
import sep from 'wsemi/src/sep.mjs'
import isnum from 'wsemi/src/isnum.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import strleft from 'wsemi/src/strleft.mjs'
import strright from 'wsemi/src/strright.mjs'
import ot from 'dayjs'


let parseData = (c) => {
    //content:
    // 全國>> 震度顯示>>
    // 觀測時間：2021-12-31 16:00:00
    // 觀測長度(秒)：50
    // 臺北市 >>
    // Staname=  北投區,Stacode=A002,Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 313.0,PGA(NS)= 313.6,PGA(EW)= 313.6,PGV(V)= -1.000,PGV(NS)= -1.000,PGV(EW)= -1.000
    // Staname=  士林區,Stacode=A006,Stalon=121.515,Stalat=25.094,震度0級,PGA(V)= 313.6,PGA(NS)= 313.6,PGA(EW)= 313.6,PGV(V)= -1.000,PGV(NS)= -1.000,PGV(EW)= -1.000
    // ...

    //lines
    let lines = sep(c, '\n')
    // console.log('lines',lines)

    //pv
    let pv = (c) => {
        let s = sep(c, '=')
        let k = get(s, 0, '')
        k = trim(k)
        let v = get(s, 1, '')
        v = trim(v)
        if (isnum(v)) {
            v = cdbl(v)
        }
        return {
            k,
            v,
        }
    }

    let eqTime = ''
    let eqDuration = ''
    let county = ''
    let rs = []
    each(lines, (v, k) => {
        let t

        if (v.indexOf('觀測時間：') >= 0) {
            t = v.replace('觀測時間：', '')
            t = trim(t)
            // console.log('t',t)
            t = ot(t, 'YYYY-MM-DD HH:mm:ss').add(8, 'hour').format('YYYY-MM-DDTHH:mm:ssZ') //地震時間為utc+0, 得+8hr
            eqTime = t
            // console.log('eqTime',eqTime)
            return true //跳出換下一個
        }
        else if (v.indexOf('觀測長度(秒)：') >= 0) {
            t = v.replace('觀測長度(秒)：', '')
            t = trim(t)
            eqDuration = t
            // console.log('eqDuration',eqDuration)
            return true //跳出換下一個
        }

        if (strright(v, 2) === '>>') {
            t = v.replace('>>', '')
            t = trim(t)
            county = t
            // console.log('county',county)
            return true //跳出換下一個
        }

        if (strleft(v, 8) === 'Staname=') {
            let s = sep(v, ',')
            let dt = {}
            let cr
            let r

            //Staname
            let Staname = pv(get(s, 0, ''))

            //Stacode
            r = pv(get(s, 1, ''))
            dt = {
                ...dt,
                code: r.v,
            }

            //Stalon
            r = pv(get(s, 2, ''))
            dt = {
                ...dt,
                lng: r.v,
            }

            //Stalat
            r = pv(get(s, 3, ''))
            dt = {
                ...dt,
                lat: r.v,
            }

            //震度n級
            r = get(s, 4, '')
            r = r.replace('震度', '')
            cr = r
            if (!isestr(cr)) {
                cr = ''
            }
            r = r.replace('級', '')
            if (isestr(r)) {
                if (r.indexOf('弱') >= 0) {
                    r = r.replace('弱', '')
                    r = cdbl(r)
                    r += 0.33 //例如 5弱 -> 5.33
                }
                else if (r.indexOf('強') >= 0) {
                    r = r.replace('強', '')
                    r = cdbl(r)
                    r += 0.66 //例如 5強 -> 5.66
                }
            }
            if (isnum(r)) {
                r = cdbl(r)
            }
            else {
                r = ''
            }
            dt = {
                ...dt,
                cintensity: cr,
                intensity: r,
            }

            //PGA(V)
            r = pv(get(s, 5, ''))
            r = r.v
            if (r < 0) {
                r = ''
            }
            dt = {
                ...dt,
                'PGA(Z)': r,
            }

            //PGA(NS)
            r = pv(get(s, 6, ''))
            r = r.v
            if (r < 0) {
                r = ''
            }
            dt = {
                ...dt,
                'PGA(N-S)': r,
            }

            //PGA(EW)
            r = pv(get(s, 7, ''))
            r = r.v
            if (r < 0) {
                r = ''
            }
            dt = {
                ...dt,
                'PGA(E-W)': r,
            }

            //PGA, 水平向最大PGA
            let PGA = ''
            if (isnum(dt['PGA(N-S)']) && isnum(dt['PGA(E-W)'])) {
                PGA = Math.max(dt['PGA(N-S)'], dt['PGA(E-W)'])
            }
            dt.PGA = PGA

            //county
            dt.county = county

            //town
            dt.town = `${county}${Staname.v}`

            //push
            rs.push(dt)

        }

    })

    let t = ot(eqTime)

    let timeTag = t.format('YYYYMMDDHHmmss')

    let timeRec = t.format('YYYY-MM-DD HH-mm:ss')

    //eq
    let eq = {
        id: timeTag, //無地震id, 改使用地震戳記時間
        // tag, //地震戳記
        // number, //當年地震編號
        time: eqTime, //地震UTC時間
        timeRec, //地震顯示時間
        timeTag, //地震戳記時間
        // ml, //芮式規模
        // depth, //深度(km)
        // location, //地震位置
        // intensity, //最大震度
        // longitude,
        // latitude,
        duration: eqDuration,
        data: rs,
    }

    return eq
}


export default parseData
