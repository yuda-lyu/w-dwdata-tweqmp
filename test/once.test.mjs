import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataTweqmp from '../src/WDwdataTweqmp.mjs'


describe('once', function() {

    let test = async() => {

        let pm = w.genPm()

        let ms = []

        let st = {} //開啟useSimulateFiles=true直接模擬ftp下載數據

        //fdDwStorageTemp
        let fdDwStorageTemp = `./_once_dwStorageTemp`
        w.fsCleanFolder(fdDwStorageTemp)

        w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdDwStorageTemp}/100000-townshipInt-All.txt`)
        w.fsCopyFile(`./test/100001-townshipInt-All.txt`, `${fdDwStorageTemp}/100001-townshipInt-All.txt`)

        //fdDwStorage
        let fdDwStorage = `./_once_dwStorage`
        w.fsCleanFolder(fdDwStorage)

        //fdDwAttime
        let fdDwAttime = `./_once_dwAttime`
        w.fsCleanFolder(fdDwAttime)

        //fdDwCurrent
        let fdDwCurrent = `./_once_dwCurrent`
        w.fsCleanFolder(fdDwCurrent)

        //fdResultTemp
        let fdResultTemp = './_once_resultTemp'
        w.fsCleanFolder(fdResultTemp)

        //fdResult
        let fdResult = './_once_result'
        w.fsCleanFolder(fdResult)

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
            // console.log('change', msg)
            ms.push(msg)
        })
        ev.on('end', () => {
            w.fsDeleteFolder(fdDwStorageTemp)
            w.fsDeleteFolder(fdDwStorage)
            w.fsDeleteFolder(fdDwAttime)
            w.fsDeleteFolder(fdDwCurrent)
            w.fsDeleteFolder(fdResultTemp)
            w.fsDeleteFolder(fdResult)
            // console.log('ms', ms)
            pm.resolve(ms)
        })

        return pm
    }
    let ms = [
        { event: 'start', msg: 'running...' },
        { event: 'proc-callfun-afterStart', msg: 'start...' },
        { event: 'proc-callfun-afterStart', msg: 'done' },
        { event: 'proc-callfun-download', msg: 'start...' },
        { event: 'proc-callfun-download', num: 2, msg: 'done' },
        { event: 'proc-callfun-getCurrent', msg: 'start...' },
        { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' },
        { event: 'compare', msg: 'start...' },
        {
            event: 'compare',
            numRemove: 0,
            numAdd: 2,
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
        { event: 'proc-callfun-beforeEnd', msg: 'start...' },
        { event: 'move-files-to-storage', msg: 'start...' },
        { event: 'move-files-to-storage', msg: 'done' },
        { event: 'proc-callfun-beforeEnd', msg: 'done' },
        { event: 'end', msg: 'done' }
    ]

    it('test once', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
