// import path from 'path'
import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'
import parseData from './src/parseData.mjs'


let j = fs.readFileSync('../_data/settings.json', 'utf8')
let st = JSON.parse(j)
let token = _.get(st, 'token')

//fdDwStorageTxtTemp
let fdDwStorageTxtTemp = `./_dwStorageTxtTemp`
w.fsCleanFolder(fdDwStorageTxtTemp)

//fdDwStorageTxt
let fdDwStorageTxt = `./_dwStorageTxt`
w.fsCleanFolder(fdDwStorageTxt)

//fdDwStorageJson
let fdDwStorageJson = `./_dwStorageJson`
w.fsCleanFolder(fdDwStorageJson)

//fdDwAttime
let fdDwAttime = `./_dwAttime`
w.fsCleanFolder(fdDwAttime)

//fdDwCurrent
let fdDwCurrent = `./_dwCurrent`
w.fsCleanFolder(fdDwCurrent)

//fdResult
let fdResult = './_result'
w.fsCleanFolder(fdResult)

//funDownloadEqs
let funDownloadEqs = async() => {

    //vfps
    let vfps = w.fsTreeFolder(fdDwStorageTxt, 1)
    // console.log('vfps', vfps)

    //eqs
    let eqs = _.map(vfps, (v) => {
        let c = fs.readFileSync(v.path, 'utf8')
        let eq = parseData(c)
        return eq
    })

    return eqs
}

let opt = {
    fdDwStorageTxtTemp,
    fdDwStorageTxt,
    fdDwStorageJson,
    fdDwAttime,
    fdDwCurrent,
    fdResult,
    funDownloadEqs,
    // funDownload,
    // funGetCurrent,
    // funRemove,
    // funAdd,
    // funModify,
}
let ev = await WDwdataTweqmp(token, opt)
    .catch((err) => {
        console.log(err)
    })
ev.on('change', (msg) => {
    delete msg.type
    console.log('change', msg)
})


//node g.funDownloadEqs.mjs
