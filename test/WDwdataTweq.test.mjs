import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataTweqmp from '../src/WDwdataTweqmp.mjs'
import parseData from '../src/parseData.mjs'


describe('WDwdataTweqmp', function() {

    let test = async() => {

        let pm = w.genPm()

        let ms = []

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
            let c
            let eq
            let eqs = []
            c = fs.readFileSync(`./test/100000-townshipInt-All.txt`, 'utf8')
            eq = parseData(c)
            eqs.push(eq)
            c = fs.readFileSync(`./test/100001-townshipInt-All.txt`, 'utf8')
            eq = parseData(c)
            eqs.push(eq)
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
            delete msg.timeRunStart
            delete msg.timeRunEnd
            delete msg.timeRunSpent
            // console.log('change', msg)
            ms.push(msg)
            if (msg.event === 'end') {
                // console.log('ms', ms)
                pm.resolve(ms)
            }
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

        return pm
    }
    let ms = [
        { event: 'start', msg: 'running...' },
        { event: 'proc-callfun-download', msg: 'start...' },
        { event: 'proc-callfun-download', msg: 'done' },
        { event: 'proc-callfun-getCurrent', msg: 'start...' },
        { event: 'proc-callfun-getCurrent', msg: 'done' },
        { event: 'compare', msg: 'start...' },
        { event: 'compare', msg: 'done' },
        {
            event: 'proc-add-callfun-add',
            id: '20220101000000',
            msg: 'start...'
        },
        { event: 'proc-add-callfun-add', id: '20220101000000', msg: 'done' },
        {
            event: 'proc-add-callfun-add',
            id: '20220101010000',
            msg: 'start...'
        },
        { event: 'proc-add-callfun-add', id: '20220101010000', msg: 'done' },
        { event: 'end', msg: 'done' }
    ]

    it('test in localhost', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
