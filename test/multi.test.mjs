import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataTweqmp from '../src/WDwdataTweqmp.mjs'


describe('multi', function() {

    let test = async() => {
        let ms = []

        let st = {} //開啟useSimulateFiles=true直接模擬ftp下載數據

        //fdTagRemove
        let fdTagRemove = `./_multi_tagRemove`
        w.fsCleanFolder(fdTagRemove)

        //fdDwStorageTemp
        let fdDwStorageTemp = `./_multi_dwStorageTemp`
        w.fsCleanFolder(fdDwStorageTemp)

        //fdDwStorage
        let fdDwStorage = `./_multi_dwStorage`
        w.fsCleanFolder(fdDwStorage)

        //fdDwAttime
        let fdDwAttime = `./_multi_dwAttime`
        w.fsCleanFolder(fdDwAttime)

        //fdDwCurrent
        let fdDwCurrent = `./_multi_dwCurrent`
        w.fsCleanFolder(fdDwCurrent)

        //fdResultTemp
        let fdResultTemp = './_multi_resultTemp'
        w.fsCleanFolder(fdResultTemp)

        //fdResult
        let fdResult = './_multi_result'
        w.fsCleanFolder(fdResult)

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = `./_multi_taskCpActualSrc`
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = `./_multi_taskCpSrc`
        w.fsCleanFolder(fdTaskCpSrc)

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
                fdTagRemove,
                fdDwStorageTemp,
                fdDwStorage,
                fdDwAttime,
                fdDwCurrent,
                fdResultTemp,
                fdResult,
                fdTaskCpActualSrc,
                fdTaskCpSrc,
            // fdLog,
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
                    'move-files-to-storage',
                ])) {
                    return
                }
                // console.log('change', msg)
                ms.push(msg)
            })
            ev.on('end', () => {
                pm.resolve()
            })

            return pm
        }
        await w.pmSeries(kpOper, async() => {
            await run()
        })

        w.fsDeleteFolder(fdTagRemove)
        w.fsDeleteFolder(fdDwStorageTemp)
        w.fsDeleteFolder(fdDwStorage)
        w.fsDeleteFolder(fdDwAttime)
        w.fsDeleteFolder(fdDwCurrent)
        w.fsDeleteFolder(fdResultTemp)
        w.fsDeleteFolder(fdResult)
        w.fsDeleteFolder(fdTaskCpActualSrc)
        w.fsDeleteFolder(fdTaskCpSrc)

        // console.log('ms', ms)
        return ms
    }
    let ms = [
        { event: 'compare', msg: 'start...' },
        {
            event: 'compare',
            numRemove: 0,
            numAdd: 1,
            numModify: 0,
            numSame: 0,
            msg: 'done'
        },
        {
            event: 'proc-add-callfun-add',
            id: '100000-townshipInt-All.txt',
            msg: 'start...'
        },
        {
            event: 'proc-add-callfun-add',
            id: '100000-townshipInt-All.txt',
            msg: 'done'
        },
        { event: 'end', msg: 'done' },
        { event: 'compare', msg: 'start...' },
        {
            event: 'compare',
            numRemove: 0,
            numAdd: 1,
            numModify: 0,
            numSame: 1,
            msg: 'done'
        },
        {
            event: 'proc-add-callfun-add',
            id: '100001-townshipInt-All.txt',
            msg: 'start...'
        },
        {
            event: 'proc-add-callfun-add',
            id: '100001-townshipInt-All.txt',
            msg: 'done'
        },
        { event: 'end', msg: 'done' },
        { event: 'compare', msg: 'start...' },
        {
            event: 'compare',
            numRemove: 0,
            numAdd: 0,
            numModify: 1,
            numSame: 1,
            msg: 'done'
        },
        {
            event: 'proc-diff-callfun-modify',
            id: '100001-townshipInt-All.txt',
            msg: 'start...'
        },
        {
            event: 'proc-diff-callfun-modify',
            id: '100001-townshipInt-All.txt',
            msg: 'done'
        },
        { event: 'end', msg: 'done' }
    ]

    it('test multi', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
