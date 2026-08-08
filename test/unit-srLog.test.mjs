import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataTweqmp from '../src/WDwdataTweqmp.mjs'
import fakeFtpServer from './lib/fakeFtpServer.mjs'


describe('srLog', function() {

    //evsDownload, 下載FTP檔案與搬移檔案階段之事件, 由WDwdataFtp與downloadFiles直接紀錄於srLog, 不經WDwdataBuilder故不發送change事件
    let evsDownload = [
        'core',
        'ftp.conn',
        'ftp.ls',
        'ftp.syncToLocal',
        'syncFiles',
        'ftp.quit',
        'getVfps',
        'move-files-to-storage',
    ]

    //rmTime, 移除紀錄內之執行時間欄位
    let rmTime = (v) => {
        let r = { ...v }
        delete r.timeRunStart
        delete r.timeRunEnd
        delete r.timeRunSpent
        return r
    }

    //rmVary, 移除各檔案而異之欄位, result為w-ftp回傳內容, name與progress為逐檔下載進度
    let rmVary = (v) => {
        let r = { ...v }
        delete r.result
        delete r.name
        delete r.progress
        return r
    }

    //isEvDownload, 是否為下載FTP檔案與搬移檔案階段之事件
    let isEvDownload = (v) => {
        return _.includes(evsDownload, v.event)
    }

    //pickByType, 自change紀錄取出指定type者, 並還原成srLog所接收之紀錄(不含type)
    let pickByType = (ms, type) => {
        return ms
            .filter((v) => {
                return v.type === type
            })
            .map((v) => {
                let r = { ...v }
                delete r.type
                return r
            })
    }

    //getEvsDownload, 自srLog.info取出下載FTP檔案與搬移檔案階段之事件, 並濾除syncToLocal之逐檔進度回報
    let getEvsDownload = (msInfo) => {
        return msInfo
            .filter(isEvDownload)
            .filter((v) => {
                return v.msg !== 'running...'
            })
            .map(rmVary)
    }

    //test, 執行一次偵測並蒐集srLog各函數與change事件所收到之紀錄
    let test = async(opt = {}) => {

        //tag, 各測試使用獨立資料夾避免平行測試時互相干擾
        let tag = _.get(opt, 'tag', 'c0')

        //useSrLog, 是否提供srLog
        let useSrLog = _.get(opt, 'useSrLog', true)

        //keysSrLog, srLog內所提供之函數
        let keysSrLog = _.get(opt, 'keysSrLog', ['info', 'warn', 'error'])

        //noFiles, 假伺服器是否不給予檔案
        let noFiles = _.get(opt, 'noFiles', false)

        //useShowLog, 未給予時不傳入opt, 用以驗證預設值
        let useShowLog = _.get(opt, 'useShowLog', null)

        //msConsole, 攔截console.log之輸出
        let msConsole = []
        let consoleLogOri = console.log
        console.log = (...args) => {
            msConsole.push(args)
        }

        let pm = w.genPm()

        //msChange, msInfo, msWarn, msError
        let msChange = []
        let msInfo = []
        let msWarn = []
        let msError = []

        //nArgs, 各次呼叫srLog函數所接收之參數數量
        let nArgs = []

        //fdSrv, 假FTP伺服器根目錄, 內含第1層2個地震數據檔案
        let fdSrv = `./_srLog_${tag}_srv`
        w.fsCleanFolder(fdSrv)
        if (!noFiles) {
            w.fsCopyFile(`./test/100000-townshipInt-All.txt`, `${fdSrv}/100000-townshipInt-All.txt`)
            w.fsCopyFile(`./test/100001-townshipInt-All.txt`, `${fdSrv}/100001-townshipInt-All.txt`)
        }

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
        let fdTagRemove = `./_srLog_${tag}_tagRemove`
        w.fsCleanFolder(fdTagRemove)

        //fdDwStorageTemp
        let fdDwStorageTemp = `./_srLog_${tag}_dwStorageTemp`
        w.fsCleanFolder(fdDwStorageTemp)

        //fdDwStorage
        let fdDwStorage = `./_srLog_${tag}_dwStorage`
        w.fsCleanFolder(fdDwStorage)

        //fdDwAttime
        let fdDwAttime = `./_srLog_${tag}_dwAttime`
        w.fsCleanFolder(fdDwAttime)

        //fdDwCurrent
        let fdDwCurrent = `./_srLog_${tag}_dwCurrent`
        w.fsCleanFolder(fdDwCurrent)

        //fdResultTemp
        let fdResultTemp = `./_srLog_${tag}_resultTemp`
        w.fsCleanFolder(fdResultTemp)

        //fdResult
        let fdResult = `./_srLog_${tag}_result`
        w.fsCleanFolder(fdResult)

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = `./_srLog_${tag}_taskCpActualSrc`
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = `./_srLog_${tag}_taskCpSrc`
        w.fsCleanFolder(fdTaskCpSrc)

        //srLog
        let srLogAll = {
            info: (...args) => {
                nArgs.push(_.size(args))
                msInfo.push({ ...args[0] })
            },
            warn: (...args) => {
                nArgs.push(_.size(args))
                msWarn.push({ ...args[0] })
            },
            error: (...args) => {
                nArgs.push(_.size(args))
                msError.push({ ...args[0] })
            },
        }
        let srLog = null
        if (useSrLog) {
            srLog = _.pick(srLogAll, keysSrLog)
        }

        let opt2 = {
            fdTagRemove,
            fdDwStorageTemp,
            fdDwStorage,
            fdDwAttime,
            fdDwCurrent,
            fdResultTemp,
            fdResult,
            fdTaskCpActualSrc,
            fdTaskCpSrc,
            srLog,
            // funDownload,
            // funGetCurrent,
            // funRemove,
            // funAdd,
            // funModify,
        }
        if (_.isBoolean(useShowLog)) {
            opt2.useShowLog = useShowLog
        }
        let ev = await WDwdataTweqmp(st, opt2)
            .catch((err) => {
                console.log(err)
            })
        ev.on('change', (msg) => {
            msChange.push({ ...msg })
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

            console.log = consoleLogOri

            pm.resolve({ msChange, msInfo, msWarn, msError, nArgs, msConsole })
        })

        return pm
    }

    //msChangeNormal, 來源2個檔案且無前次數據時, 偵測數據變更階段所發送之紀錄
    let msChangeNormal = [
        { type: 'info', event: 'start', msg: 'running...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'done' },
        { type: 'info', event: 'proc-callfun-download', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-download', num: 2, msg: 'done' },
        { type: 'info', event: 'proc-callfun-getCurrent', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-getCurrent', num: 0, msg: 'done' },
        { type: 'info', event: 'proc-compare', msg: 'start...' },
        {
            type: 'info',
            event: 'proc-compare',
            numRemove: 0,
            numAdd: 2,
            numModify: 0,
            numSame: 0,
            msg: 'done'
        },
        { type: 'info', event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'start...' },
        { type: 'info', event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'done' },
        { type: 'info', event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'start...' },
        { type: 'info', event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'done' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'done' },
        { type: 'info', event: 'end', msg: 'done' },
    ]

    //msDownloadNormal, 來源2個檔案時, 下載FTP檔案與搬移檔案階段所紀錄之事件, 已濾除syncToLocal之逐檔進度回報
    let msDownloadNormal = [
        { event: 'core', msg: 'start...' },
        { event: 'ftp.conn', msg: 'start...' },
        { event: 'ftp.conn', msg: 'done' },
        { event: 'syncFiles', msg: 'start...' },
        { event: 'ftp.ls', length: 2, msg: 'done' },
        { event: 'ftp.syncToLocal', msg: 'start...' },
        { event: 'ftp.syncToLocal', msg: 'done' },
        { event: 'syncFiles', msg: 'done' },
        { event: 'ftp.quit', msg: 'done' },
        { event: 'core', msg: 'done' },
        { event: 'getVfps', msg: 'start...' },
        { event: 'getVfps', length: 2, msg: 'done' },
        { event: 'move-files-to-storage', msg: 'start...' },
        { event: 'move-files-to-storage', msg: 'done' },
    ]

    //msChangeNoFiles, 來源無檔案時, 偵測數據變更階段所發送之紀錄, 因beforeEnd階段不論有無錯誤皆執行, 故仍有proc-callfun-beforeEnd
    let msChangeNoFiles = [
        { type: 'info', event: 'start', msg: 'running...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'done' },
        { type: 'info', event: 'proc-callfun-download', msg: 'start...' },
        { type: 'error', event: 'proc-callfun-download', msg: 'no files' },
        { type: 'info', event: 'cancel-stage-main', msg: 'error at proc-callfun-download' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'done' },
        { type: 'info', event: 'cancel-stage-beforeEnd', msg: 'error at proc-callfun-download' },
        { type: 'info', event: 'end', msg: 'done' },
    ]

    it('test srLog: 偵測數據變更階段之事件, srLog.info與change事件內容一致', async () => {
        let r = await test({ tag: 'c1' })
        let rr = pickByType(msChangeNormal, 'info')
        assert.strict.deepEqual(r.msInfo.filter((v) => !isEvDownload(v)).map(rmTime), rr)
    })

    it('test srLog: 下載FTP檔案與搬移檔案階段之事件, 僅紀錄於srLog不發送change事件', async () => {
        let r = await test({ tag: 'c2' })
        let rr = { evsInChange: [], evsInSrLog: msDownloadNormal }
        assert.strict.deepEqual({
            evsInChange: r.msChange.filter(isEvDownload),
            evsInSrLog: getEvsDownload(r.msInfo),
        }, rr)
    })

    it('test srLog: 下載FTP檔案階段, syncToLocal逐檔回報下載進度', async () => {
        let r = await test({ tag: 'c3' })
        let ps = r.msInfo.filter((v) => {
            return v.event === 'ftp.syncToLocal' && v.msg === 'running...'
        })
        let rr = { names: ['100000-townshipInt-All.txt', '100001-townshipInt-All.txt'], allProgressValid: true }
        assert.strict.deepEqual({
            names: _.uniq(ps.map((v) => v.name)).sort(),
            allProgressValid: _.every(ps, (v) => _.isFinite(v.progress) && v.progress >= 0 && v.progress <= 100),
        }, rr)
    })

    it('test srLog: srLog各函數僅接收一紀錄物件', async () => {
        let r = await test({ tag: 'c4' })
        let rr = _.uniq(r.nArgs)
        assert.strict.deepEqual(rr, [1])
    })

    it('test srLog: 無錯誤時不呼叫srLog.warn與srLog.error', async () => {
        let r = await test({ tag: 'c5' })
        let rr = { numWarn: 0, numError: 0 }
        assert.strict.deepEqual({ numWarn: _.size(r.msWarn), numError: _.size(r.msError) }, rr)
    })

    it('test srLog: 來源無檔案時, 錯誤紀錄於srLog.error且change事件type為error', async () => {
        let r = await test({ tag: 'c6', noFiles: true })
        let rr = {
            msError: [
                { event: 'proc-callfun-download', msg: 'no files' },
                { event: 'move-files-to-storage', msg: 'no files' },
            ],
            msChange: msChangeNoFiles,
        }
        assert.strict.deepEqual({
            msError: r.msError,
            msChange: r.msChange.map(rmTime),
        }, rr)
    })

    it('test srLog: 僅提供info時, 未提供之error不影響change事件發送', async () => {
        let r = await test({ tag: 'c7', noFiles: true, keysSrLog: ['info'] })
        let rr = {
            msChange: msChangeNoFiles,
            msInfo: pickByType(msChangeNoFiles, 'info'),
            numError: 0,
        }
        assert.strict.deepEqual({
            msChange: r.msChange.map(rmTime),
            msInfo: r.msInfo.filter((v) => !isEvDownload(v)).map(rmTime),
            numError: _.size(r.msError),
        }, rr)
    })

    it('test srLog: 未提供srLog時, change事件仍完整發送', async () => {
        let r = await test({ tag: 'c8', useSrLog: false })
        let rr = msChangeNormal
        assert.strict.deepEqual(r.msChange.map(rmTime), rr)
    })

    //cntConsole, 統計console.log所收到之輸出類別
    let cntConsole = (ms) => {
        let numErr = _.size(ms.filter((v) => {
            return _.get(v, [0]) instanceof Error
        }))
        let numCancel = _.size(ms.filter((v) => {
            return _.get(v, [0]) === 'error occurred, task canceled'
        }))
        return { numErr, numCancel, numAll: _.size(ms) }
    }

    it('test useShowLog: 預設為true時, 偵測數據變更之錯誤與取消訊息輸出至console', async () => {
        let r = await test({ tag: 'c9', noFiles: true })
        let rr = { numErr: 1, numCancel: 2, numAll: 3 } //下載階段之catch輸出1次錯誤, 主階段與結束前階段各輸出1次取消訊息
        assert.strict.deepEqual(cntConsole(r.msConsole), rr)
    })

    it('test useShowLog: 為false時, 不輸出至console', async () => {
        let r = await test({ tag: 'c10', noFiles: true, useShowLog: false })
        let rr = { numErr: 0, numCancel: 0, numAll: 0 }
        assert.strict.deepEqual(cntConsole(r.msConsole), rr)
    })

    it('test useShowLog: 為false時, srLog紀錄與change事件不受影響', async () => {
        let r = await test({ tag: 'c11', noFiles: true, useShowLog: false })
        let rr = {
            msError: [
                { event: 'proc-callfun-download', msg: 'no files' },
                { event: 'move-files-to-storage', msg: 'no files' },
            ],
            msChange: msChangeNoFiles,
        }
        assert.strict.deepEqual({
            msError: r.msError,
            msChange: r.msChange.map(rmTime),
        }, rr)
    })

})
