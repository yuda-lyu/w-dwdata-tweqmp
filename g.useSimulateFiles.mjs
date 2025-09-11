// import path from 'path'
import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'


let st = {} //開啟useSimulateFiles=true直接模擬ftp下載數據

//fdDwStorageTemp
let fdDwStorageTemp = `./_dwStorageTemp`
w.fsCleanFolder(fdDwStorageTemp)

//fdDwStorage
let fdDwStorage = `./_dwStorage`
w.fsCleanFolder(fdDwStorage)

//fdDwAttime
let fdDwAttime = `./_dwAttime`
w.fsCleanFolder(fdDwAttime)

//fdDwCurrent
let fdDwCurrent = `./_dwCurrent`
w.fsCleanFolder(fdDwCurrent)

//fdResultTemp
let fdResultTemp = './_resultTemp'
w.fsCleanFolder(fdResultTemp)

//fdResult
let fdResult = './_result'
w.fsCleanFolder(fdResult)

let kpOper = {
    1: () => {
        w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdDwStorageTemp}/100000-townshipInt-All.txt`)
    },
    2: () => { //add 100001
        w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdDwStorageTemp}/100000-townshipInt-All.txt`)
        w.fsCopyFile(`./test/100001-townshipInt-All.txt`, `${fdDwStorageTemp}/100001-townshipInt-All.txt`)
    },
    3: () => { //modify 100001
        w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdDwStorageTemp}/100000-townshipInt-All.txt`)
        let c = fs.readFileSync(`./test/100001-townshipInt-All.txt`, 'utf8')
        c = c.replace(
            `Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 235.44,PGA(NS)= 235.44,PGA(EW)= 235.44`,
            `Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 225.99,PGA(NS)= 215.85,PGA(EW)= 202.53`,
        )
        fs.writeFileSync(`${fdDwStorageTemp}/100001-townshipInt-All.txt`, c, 'utf8')
    },
}

let i = 0
let run = async() => {
    i++

    let pm = w.genPm()

    //依照i模擬ftp下載數據
    kpOper[i]()

    let opt = {
        useSimulateFiles: true, //模擬ftp下載數據
        fdDwStorageTemp,
        fdDwStorage,
        fdDwAttime,
        fdDwCurrent,
        fdResultTemp,
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
        delete msg.timeRunStart
        delete msg.timeRunEnd
        delete msg.timeRunSpent
        if (w.arrHas(msg.event, [
            'start',
            'proc-callfun-download',
            'proc-callfun-getCurrent',
            'proc-callfun-afterStart',
            'proc-callfun-beforeEnd',
        ])) {
            return
        }
        console.log('change', msg)
    })
    ev.on('end', () => {
        pm.resolve()
    })

    return pm
}
await w.pmSeries(kpOper, async() => {
    await run()
})
// change { event: 'compare', msg: 'start...' }
// change {
//   event: 'compare',
//   numRemove: 0,
//   numAdd: 1,
//   numModify: 0,
//   numSame: 0,
//   msg: 'done'
// }
// change {
//   event: 'proc-add-callfun-add',
//   id: '100000-townshipInt-All.txt',
//   msg: 'start...'
// }
// change {
//   event: 'proc-add-callfun-add',
//   id: '100000-townshipInt-All.txt',
//   msg: 'done'
// }
// change { event: 'end', msg: 'done' }
// change { event: 'compare', msg: 'start...' }
// change {
//   event: 'compare',
//   numRemove: 0,
//   numAdd: 1,
//   numModify: 0,
//   numSame: 1,
//   msg: 'done'
// }
// change {
//   event: 'proc-add-callfun-add',
//   id: '100001-townshipInt-All.txt',
//   msg: 'start...'
// }
// change {
//   event: 'proc-add-callfun-add',
//   id: '100001-townshipInt-All.txt',
//   msg: 'done'
// }
// change { event: 'end', msg: 'done' }
// change { event: 'compare', msg: 'start...' }
// change {
//   event: 'compare',
//   numRemove: 0,
//   numAdd: 0,
//   numModify: 1,
//   numSame: 1,
//   msg: 'done'
// }
// change {
//   event: 'proc-diff-callfun-modify',
//   id: '100001-townshipInt-All.txt',
//   msg: 'start...'
// }
// change {
//   event: 'proc-diff-callfun-modify',
//   id: '100001-townshipInt-All.txt',
//   msg: 'done'
// }
// change { event: 'end', msg: 'done' }


//node g.useSimulateFiles.mjs
