import w from 'wsemi'
import assert from 'assert'
import WDwdataTweqmp from '../src/WDwdataTweqmp.mjs'
import fakeFtpServer from './lib/fakeFtpServer.mjs'


describe('once', function() {

    let test = async() => {

        let pm = w.genPm()

        let ms = []

        //tag
        let tag = `_once`

        //fdSrv, 假FTP伺服器根目錄, 供模擬待下載之地震數據
        let fdSrv = `./${tag}_srv`
        w.fsCleanFolder(fdSrv)

        w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdSrv}/100000-townshipInt-All.txt`)
        w.fsCopyFile(`./test/100001-townshipInt-All.txt`, `${fdSrv}/100001-townshipInt-All.txt`)

        //srv, port給0由系統指派, 避免平行測試時衝突
        let srv = await fakeFtpServer({ fdRoot: fdSrv })

        //st, 連線至假伺服器
        let st = {
            transportation: 'FTP',
            hostname: '127.0.0.1',
            port: srv.port,
            username: 'u1',
            password: 'p1',
            fdIni: '.',
        }

        //fdTagRemove
        let fdTagRemove = `./${tag}_tagRemove`
        w.fsCleanFolder(fdTagRemove)

        //fdDwStorageTemp
        let fdDwStorageTemp = `./${tag}_dwStorageTemp`
        w.fsCleanFolder(fdDwStorageTemp)

        //fdDwStorage
        let fdDwStorage = `./${tag}_dwStorage`
        w.fsCleanFolder(fdDwStorage)

        //fdDwAttime
        let fdDwAttime = `./${tag}_dwAttime`
        w.fsCleanFolder(fdDwAttime)

        //fdDwCurrent
        let fdDwCurrent = `./${tag}_dwCurrent`
        w.fsCleanFolder(fdDwCurrent)

        //fdResultTemp
        let fdResultTemp = `./${tag}_resultTemp`
        w.fsCleanFolder(fdResultTemp)

        //fdResult
        let fdResult = `./${tag}_result`
        w.fsCleanFolder(fdResult)

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = `./${tag}_taskCpActualSrc`
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = `./${tag}_taskCpSrc`
        w.fsCleanFolder(fdTaskCpSrc)

        let opt = {
            fdTagRemove,
            fdDwStorageTemp,
            fdDwStorage,
            fdDwAttime,
            fdDwCurrent,
            fdResultTemp,
            fdResult,
            fdTaskCpActualSrc,
            fdTaskCpSrc,
            // srLog,
            // useShowLog,
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
        ev.on('end', async() => {

            await srv.close()

            w.fsDeleteFolder(fdSrv)
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
        { event: 'proc-compare', msg: 'start...' },
        {
            event: 'proc-compare',
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
        { event: 'proc-callfun-beforeEnd', msg: 'done' },
        { event: 'end', msg: 'done' }
    ]

    it('test once', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
