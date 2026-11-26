import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataTweqmp from '../src/WDwdataTweqmp.mjs'
import fakeFtpServer from './lib/fakeFtpServer.mjs'
import genEqContent from './lib/genEqContent.mjs'


describe('badFile', function() {

    //evsKeep, 僅比對與數據檔處理相關之事件
    let evsKeep = [
        'proc-add-callfun-add',
        'proc-diff-callfun-modify',
        'proc-add-check-data',
        'proc-diff-check-data',
        'cancel-stage-main',
        'end',
    ]

    //snapTree, 擷取fdResult內各資料夾及其檔案內容, 供比對結果是否被寫出或被動到
    let snapTree = (fd) => {
        let r = {}
        for (let name of fs.readdirSync(fd)) {
            let fdSub = `${fd}/${name}`
            r[name] = {}
            for (let fn of fs.readdirSync(fdSub)) {
                r[name][fn] = fs.readFileSync(`${fdSub}/${fn}`, 'utf8')
            }
        }
        return r
    }

    //fdBase, 測試中之臨時資料夾(假伺服器根目錄與各工作資料夾), 測完刪除
    let fdBase = './test/_tmp/badFile'
    after(() => {
        fs.rmSync(fdBase, { recursive: true, force: true })
    })

    //runRounds, 以假FTP伺服器連續執行多輪偵測, 各輪開始前由prepare(fdSrv)更新伺服器內待下載之檔案
    let runRounds = async(tag, prepares, optUse = {}) => {

        //useShowLog
        let useShowLog = _.get(optUse, 'useShowLog', false)

        //srLogErrorThrows, srLog.error是否拋錯(模擬使用端紀錄通道失效)
        let srLogErrorThrows = _.get(optUse, 'srLogErrorThrows', false)

        //srLogErrorRejects, srLog.error是否回傳被reject之Promise(模擬使用端非同步紀錄通道失效)
        let srLogErrorRejects = _.get(optUse, 'srLogErrorRejects', false)

        //consoleThrows, console.log於輸出略過訊息時是否拋錯(模擬標準輸出失效)
        let consoleThrows = _.get(optUse, 'consoleThrows', false)

        //listenerThrows, change事件之監聽函數於收到略過事件時是否拋錯(模擬使用端監聽函數失效)
        let listenerThrows = _.get(optUse, 'listenerThrows', false)

        //noSrLog, 是否不提供srLog
        let noSrLog = _.get(optUse, 'noSrLog', false)

        //unhandled, 記錄未被處理之Promise reject
        let unhandled = []
        let onUnhandled = (err) => {
            unhandled.push(err)
        }
        process.on('unhandledRejection', onUnhandled)

        //msConsole, 攔截console.log之輸出
        let msConsole = []
        let consoleLogOri = console.log
        console.log = (...args) => {
            msConsole.push(args)
            if (consoleThrows && _.isString(args[0]) && args[0].indexOf('check-data') >= 0) {
                throw new Error('console failure')
            }
        }

        fs.mkdirSync(fdBase, { recursive: true })
        let fdSrv = `${fdBase}/${tag}_srv`
        let fds = {
            fdTagRemove: `${fdBase}/${tag}_tagRemove`,
            fdDwStorageTemp: `${fdBase}/${tag}_dwStorageTemp`,
            fdDwStorage: `${fdBase}/${tag}_dwStorage`,
            fdDwAttime: `${fdBase}/${tag}_dwAttime`,
            fdDwCurrent: `${fdBase}/${tag}_dwCurrent`,
            fdResultTemp: `${fdBase}/${tag}_resultTemp`,
            fdResult: `${fdBase}/${tag}_result`,
            fdTaskCpActualSrc: `${fdBase}/${tag}_taskCpActualSrc`,
            fdTaskCpSrc: `${fdBase}/${tag}_taskCpSrc`,
        }
        w.fsCleanFolder(fdSrv)
        _.each(fds, (fd) => {
            w.fsCleanFolder(fd)
        })

        //srv, port給0由系統指派, 避免平行測試時衝突
        let srv = await fakeFtpServer({ fdRoot: fdSrv })

        let st = {
            transportation: 'FTP',
            hostname: '127.0.0.1',
            port: srv.port,
            username: 'u1',
            password: 'p1',
            fdIni: '.',
        }

        let rounds = []
        try {
            for (let prepare of prepares) {

                prepare(fdSrv)

                let pm = w.genPm()
                let ms = []
                let msErr = []
                let srLog = {
                    info: () => {},
                    error: (o) => {
                        msErr.push({ ...o })
                        if (srLogErrorThrows) {
                            throw new Error('sink failure')
                        }
                        if (srLogErrorRejects) {
                            return Promise.reject(new Error('sink rejected'))
                        }
                    },
                }
                let ev = await WDwdataTweqmp(st, { ...fds, srLog: noSrLog ? null : srLog, useShowLog })
                ev.on('change', (msg) => {
                    if (_.includes(evsKeep, msg.event)) {
                        ms.push(_.omit(msg, ['timeRunStart', 'timeRunEnd', 'timeRunSpent']))
                        if (listenerThrows && _.includes(['proc-add-check-data', 'proc-diff-check-data'], msg.event)) {
                            throw new Error('listener failure')
                        }
                    }
                })
                ev.on('end', () => {
                    pm.resolve()
                })
                await pm

                rounds.push({ ms, msErr, tree: snapTree(fds.fdResult) })
            }
        }
        finally {
            console.log = consoleLogOri
            try {
                await srv.close()
                w.fsDeleteFolder(fdSrv)
                _.each(fds, (fd) => {
                    w.fsDeleteFolder(fd)
                })

                //未處理之reject於其後之事件迴圈階段才通報, 故讓出一次後再移除監聽
                await new Promise((resolve) => {
                    setImmediate(resolve)
                })
            }
            finally {
                //無論清理是否失敗皆須移除監聽, 避免洩漏至同一worker之後續測試
                process.off('unhandledRejection', onUnhandled)
            }
        }

        return { rounds, msConsole, unhandled }
    }

    //fns, 4個數據檔名, 依檔名排序為處理順序: 第1與第4個為完整檔, 第2與第3個為殘檔
    let fn1 = '310001-townshipInt-All.txt'
    let fn2 = '310002-townshipInt-All.txt'
    let fn3 = '310003-townshipInt-All.txt'
    let fn4 = '310004-townshipInt-All.txt'

    //各檔之觀測時間(UTC+0)與解析後id(加8小時), base使各檔測站值相異
    let c1 = genEqContent({ time: '2021-12-31 16:00:00', base: 0 }) //id 20220101000000
    let c2 = genEqContent({ time: '2022-01-01 16:00:00', base: 10 }) //id 20220102000000
    let c3 = genEqContent({ time: '2022-01-02 16:00:00', base: 20 }) //id 20220103000000
    let c4 = genEqContent({ time: '2022-01-03 16:00:00', base: 30 }) //id 20220104000000

    //c2cut, 傳輸中斷之殘檔: 截於最末測站列之中(第15行缺最後1欄), 修前id正確但缺1筆測站而被當成完整檔
    let c2cut = c2.slice(0, c2.lastIndexOf(',PGV(EW)'))
    let msgCut2 = 'invalid c.line[15]: must be a complete station record'

    //c3cut, 傳輸中斷之殘檔: 截於觀測時間標籤之後, 修前id為Invalid Date而寫出Invalid Date.json
    let c3cut = c3.slice(0, c3.indexOf('觀測時間：') + '觀測時間：'.length)
    let msgCut3 = 'invalid c.observationTime: must be a date time string YYYY-MM-DD HH:mm:ss'

    //c2fix與c3fix, 下輪重新下載所得之完整檔, 內容與殘檔不同故hash不同
    let c2fix = c2
    let c3fix = c3

    let write = (fdSrv, fn, c) => {
        fs.writeFileSync(`${fdSrv}/${fn}`, c, 'utf8')
    }

    it('新增之殘檔須略過且不寫出結果, 不得中止本輪其餘檔案, 下輪完整檔須復原', async () => {
        //觀測重現: 修前殘檔經parseData得id為Invalid Date或缺測站卻被當成完整檔, 結果資料夾內寫出Invalid Date.json, 下游以檔名取戳記時間而失效
        let { rounds } = await runRounds('_badFile1', [
            (fdSrv) => {
                write(fdSrv, fn1, c1)
                write(fdSrv, fn2, c2cut)
                write(fdSrv, fn3, c3cut)
                write(fdSrv, fn4, c4)
            },
            (fdSrv) => {
                write(fdSrv, fn1, c1)
                write(fdSrv, fn2, c2fix)
                write(fdSrv, fn3, c3fix)
                write(fdSrv, fn4, c4)
            },
        ])
        let r0 = rounds[0]
        let r1 = rounds[1]

        //round 1: 殘檔(第2與第3個)略過, 其後之完整檔(第4個)仍處理, 不中止本輪
        let rr0 = {
            ms: [
                { type: 'info', event: 'proc-add-callfun-add', id: fn1, msg: 'start...' },
                { type: 'info', event: 'proc-add-callfun-add', id: fn1, msg: 'done' },
                { type: 'info', event: 'proc-add-callfun-add', id: fn2, msg: 'start...' },
                { type: 'error', event: 'proc-add-check-data', id: fn2, msg: msgCut2 },
                { type: 'info', event: 'proc-add-callfun-add', id: fn2, msg: 'done' }, //funAdd未拋錯故仍為done, 錯誤以上列error事件通知
                { type: 'info', event: 'proc-add-callfun-add', id: fn3, msg: 'start...' },
                { type: 'error', event: 'proc-add-check-data', id: fn3, msg: msgCut3 },
                { type: 'info', event: 'proc-add-callfun-add', id: fn3, msg: 'done' },
                { type: 'info', event: 'proc-add-callfun-add', id: fn4, msg: 'start...' },
                { type: 'info', event: 'proc-add-callfun-add', id: fn4, msg: 'done' },
                { type: 'info', event: 'end', msg: 'done' },
            ],
            msErr: [
                { event: 'proc-add-check-data', id: fn2, msg: msgCut2 },
                { event: 'proc-add-check-data', id: fn3, msg: msgCut3 },
            ],
            names: {
                [fn1]: ['20220101000000.json'],
                [fn4]: ['20220104000000.json'],
            },
        }
        let rr0Real = {
            ms: r0.ms,
            msErr: r0.msErr,
            names: _.mapValues(r0.tree, (o) => _.keys(o)),
        }
        assert.strict.deepEqual(rr0Real, rr0)

        //round 2: 殘檔已為完整檔(hash與storage內殘檔不同)故以modify處理, 完整檔未變者不處理
        let rr1 = {
            ms: [
                { type: 'info', event: 'proc-diff-callfun-modify', id: fn2, msg: 'start...' },
                { type: 'info', event: 'proc-diff-callfun-modify', id: fn2, msg: 'done' },
                { type: 'info', event: 'proc-diff-callfun-modify', id: fn3, msg: 'start...' },
                { type: 'info', event: 'proc-diff-callfun-modify', id: fn3, msg: 'done' },
                { type: 'info', event: 'end', msg: 'done' },
            ],
            msErr: [],
            names: {
                [fn1]: ['20220101000000.json'],
                [fn2]: ['20220102000000.json'],
                [fn3]: ['20220103000000.json'],
                [fn4]: ['20220104000000.json'],
            },
        }
        let rr1Real = {
            ms: r1.ms,
            msErr: r1.msErr,
            names: _.mapValues(r1.tree, (o) => _.keys(o)),
        }
        assert.strict.deepEqual(rr1Real, rr1)

        //任何輪次皆不得寫出Invalid Date.json
        let all = _.flatMap(rounds, (r) => _.flatMap(r.tree, (o) => _.keys(o)))
        assert.ok(!_.some(all, (fn) => fn.indexOf('Invalid') >= 0), '結果內不得有以Invalid Date為名之檔案')
    })

    it('變更為殘檔時須保留既有結果, 下輪完整檔須取代之', async () => {
        //modify路徑: 修前先清空結果資料夾再解析, 殘檔使既有結果被清掉或被壞檔取代
        let { rounds } = await runRounds('_badFile2', [
            (fdSrv) => {
                write(fdSrv, fn2, c1) //第1輪: 完整檔
            },
            (fdSrv) => {
                write(fdSrv, fn2, c2cut) //第2輪: 同檔名變為殘檔(傳輸中斷)
            },
            (fdSrv) => {
                write(fdSrv, fn2, c3) //第3輪: 同檔名重新下載為完整檔
            },
        ])

        //round 1
        let r0 = _.mapValues(rounds[0].tree, (o) => _.keys(o))
        assert.strict.deepEqual(r0, { [fn2]: ['20220101000000.json'] })

        //round 2: 保留round 1之結果(內容逐字相同), 記錄略過事件, 不拋錯不中止
        let r1 = {
            ms: rounds[1].ms,
            msErr: rounds[1].msErr,
            kept: _.isEqual(rounds[1].tree, rounds[0].tree),
        }
        let rr1 = {
            ms: [
                { type: 'info', event: 'proc-diff-callfun-modify', id: fn2, msg: 'start...' },
                { type: 'error', event: 'proc-diff-check-data', id: fn2, msg: msgCut2 },
                { type: 'info', event: 'proc-diff-callfun-modify', id: fn2, msg: 'done' },
                { type: 'info', event: 'end', msg: 'done' },
            ],
            msErr: [{ event: 'proc-diff-check-data', id: fn2, msg: msgCut2 }],
            kept: true,
        }
        assert.strict.deepEqual(r1, rr1)

        //round 3: 完整檔取代既有結果, 資料夾內只剩新戳記時間之檔案
        let r2 = {
            names: _.mapValues(rounds[2].tree, (o) => _.keys(o)),
            msErr: rounds[2].msErr,
        }
        let rr2 = {
            names: { [fn2]: ['20220103000000.json'] },
            msErr: [],
        }
        assert.strict.deepEqual(r2, rr2)
    })

    it('各紀錄通道失效時(srLog.error拋錯或回傳被reject之Promise, console.log拋錯, change監聽函數拋錯, 未提供srLog), 略過殘檔仍不得中止本輪, 其餘通道仍須送達', async () => {
        //紀錄通道失效不得使略過流程失敗(否則殘檔仍使本輪中止, 其後之完整檔遺失); 三個通知通道(console, srLog, change事件)互相隔離
        let prepare = (fdSrv) => {
            write(fdSrv, fn1, c1)
            write(fdSrv, fn2, c2cut)
            write(fdSrv, fn3, c3)
        }
        let pickConsole = (msConsole) => {
            return _.filter(msConsole, (v) => _.isString(v[0]) && v[0].indexOf('proc-add-check-data') >= 0)
        }
        let modes = [
            { name: 'srLog.error拋錯', opt: { srLogErrorThrows: true }, nSrLogError: 1, nConsole: 0 },
            { name: 'srLog.error回傳被reject之Promise', opt: { srLogErrorRejects: true }, nSrLogError: 1, nConsole: 0 },
            { name: 'console.log拋錯', opt: { useShowLog: true, consoleThrows: true }, nSrLogError: 1, nConsole: 1 },
            { name: 'change監聽函數拋錯', opt: { listenerThrows: true }, nSrLogError: 1, nConsole: 0 },
            { name: '未提供srLog', opt: { noSrLog: true }, nSrLogError: 0, nConsole: 0 },
        ]
        let r = []
        let rr = []
        for (let i = 0; i < modes.length; i++) {
            let m = modes[i]
            let { rounds, msConsole, unhandled } = await runRounds(`_badFile5_${i}`, [prepare], m.opt)
            r.push({
                name: m.name,
                ms: rounds[0].ms, //change事件(含略過事件, 監聽函數拋錯者亦已收到)
                nSrLogError: _.size(rounds[0].msErr), //srLog.error被呼叫之次數(拋錯或reject者亦計)
                nConsole: _.size(pickConsole(msConsole)), //console.log被呼叫之次數(拋錯者亦計)
                nUnhandled: _.size(unhandled), //未被處理之Promise reject數
                names: _.mapValues(rounds[0].tree, (o) => _.keys(o)),
            })
            rr.push({
                name: m.name,
                ms: [
                    { type: 'info', event: 'proc-add-callfun-add', id: fn1, msg: 'start...' },
                    { type: 'info', event: 'proc-add-callfun-add', id: fn1, msg: 'done' },
                    { type: 'info', event: 'proc-add-callfun-add', id: fn2, msg: 'start...' },
                    { type: 'error', event: 'proc-add-check-data', id: fn2, msg: msgCut2 },
                    { type: 'info', event: 'proc-add-callfun-add', id: fn2, msg: 'done' },
                    { type: 'info', event: 'proc-add-callfun-add', id: fn3, msg: 'start...' },
                    { type: 'info', event: 'proc-add-callfun-add', id: fn3, msg: 'done' },
                    { type: 'info', event: 'end', msg: 'done' },
                ],
                nSrLogError: m.nSrLogError,
                nConsole: m.nConsole,
                nUnhandled: 0,
                names: {
                    [fn1]: ['20220101000000.json'],
                    [fn3]: ['20220103000000.json'],
                },
            })
        }
        assert.strict.deepEqual(r, rr)
    })

    it('useShowLog為true時, 略過殘檔之訊息須輸出至console, 預設false時不輸出', async () => {
        let prepare = (fdSrv) => {
            write(fdSrv, fn1, c1)
            write(fdSrv, fn2, c2cut)
        }
        let rOn = await runRounds('_badFile3', [prepare], { useShowLog: true })
        let rOff = await runRounds('_badFile4', [prepare], { useShowLog: false })

        let pick = (msConsole) => {
            return _.filter(msConsole, (v) => _.isString(v[0]) && v[0].indexOf('proc-add-check-data') >= 0)
        }
        let r = {
            on: pick(rOn.msConsole),
            off: pick(rOff.msConsole),
        }
        let rr = {
            on: [[`proc-add-check-data id[${fn2}] ${msgCut2}`]],
            off: [],
        }
        assert.strict.deepEqual(r, rr)
    })

})
