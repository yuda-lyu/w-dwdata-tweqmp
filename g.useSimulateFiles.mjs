// import path from 'path'
import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'


let st = {} //開啟useSimulateFiles=true直接模擬ftp下載數據

//fdDwStorageTemp
let fdDwStorageTemp = `./_dwStorageTemp`
w.fsCleanFolder(fdDwStorageTemp)

w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdDwStorageTemp}/100000-townshipInt-All.txt`)
w.fsCopyFile(`./test/100001-townshipInt-All.txt`, `${fdDwStorageTemp}/100001-townshipInt-All.txt`)

//fdDwStorage
let fdDwStorage = `./_dwStorage`
w.fsCleanFolder(fdDwStorage)

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
    useSimulateFiles: true, //模擬ftp下載數據
    fdDwStorageTemp,
    fdDwStorage,
    fdDwAttime,
    fdDwCurrent,
    fdResult,
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
// change { event: 'compare', numRemove: 0, numAdd: 2, numModify: 0, numSame: 0, msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'done' }
// ...


//node g.useSimulateFiles.mjs
