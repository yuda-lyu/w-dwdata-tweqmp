// import path from 'path'
import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'


// let j = fs.readFileSync('../_data/settings.json', 'utf8')
// let st = JSON.parse(j)
let st = {
    'hostname': '{hostname}',
    'port': 21,
    'username': '{username}',
    'password': '{password}',
    'fdIni': './'
}

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

let opt = {
    fdDwStorageTxtTemp,
    fdDwStorageTxt,
    fdDwStorageJson,
    fdDwAttime,
    fdDwCurrent,
    fdResult,
    // funDownloadEqs,
    // funDownload,
    // funGetCurrent,
    // funRemove,
    // funAdd,
    // funModify,
}
let ev = await WDwdataTweqmp(st, opt)
    .catch((err) => {
        console.log(err)
    })
ev.on('change', (msg) => {
    delete msg.type
    console.log('change', msg)
})
// change { event: 'start', msg: 'running...' }
// change { event: 'proc-callfun-download', msg: 'start...' }
// change { event: 'proc-callfun-download', msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', msg: 'done' }
// change { event: 'compare', msg: 'start...' }
// change { event: 'compare', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '20220101000000', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '20220101000000', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '20220101010000', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '20220101010000', msg: 'done' }
// ...


//node g.mjs
