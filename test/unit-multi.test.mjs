import fs from 'fs'
import w from 'wsemi'
import assert from 'assert'
import WDwdataTweqmp from '../src/WDwdataTweqmp.mjs'
import fakeFtpServer from './lib/fakeFtpServer.mjs'


describe('multi', function() {

    let test = async() => {
        let ms = []

        //tag
        let tag = `_multi`

        //fdSrv, 假FTP伺服器根目錄, 供模擬待下載之地震數據
        let fdSrv = `./${tag}_srv`
        w.fsCleanFolder(fdSrv)

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

        let kpOper = {
            1: () => {
                w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdSrv}/100000-townshipInt-All.txt`)
            },
            2: () => { //add 100001
                w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdSrv}/100000-townshipInt-All.txt`)
                w.fsCopyFile(`./test/100001-townshipInt-All.txt`, `${fdSrv}/100001-townshipInt-All.txt`)
            },
            3: () => { //modify 100001
                w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdSrv}/100000-townshipInt-All.txt`)
                let c = fs.readFileSync(`./test/100001-townshipInt-All.txt`, 'utf8')
                c = c.replace(
                    `Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 235.44,PGA(NS)= 235.44,PGA(EW)= 235.44`,
                    `Stalon=121.467,Stalat=25.126,震度0級,PGA(V)= 225.99,PGA(NS)= 215.85,PGA(EW)= 202.53`,
                )
                fs.writeFileSync(`${fdSrv}/100001-townshipInt-All.txt`, c, 'utf8')
            },
        }

        let i = 0
        let run = async() => {
            i++

            let pm = w.genPm()

            //依照i更新假伺服器內待下載檔案
            kpOper[i]()

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
        return ms
    }
    let ms = [
        { event: 'proc-compare', msg: 'start...' },
        {
            event: 'proc-compare',
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
        { event: 'proc-compare', msg: 'start...' },
        {
            event: 'proc-compare',
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
        { event: 'proc-compare', msg: 'start...' },
        {
            event: 'proc-compare',
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
