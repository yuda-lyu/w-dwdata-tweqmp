import fs from 'fs'
import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isbol from 'wsemi/src/isbol.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import fsIsFolder from 'wsemi/src/fsIsFolder.mjs'
import fsCleanFolder from 'wsemi/src/fsCleanFolder.mjs'
import fsCreateFolder from 'wsemi/src/fsCreateFolder.mjs'
import fsCopyFolder from 'wsemi/src/fsCopyFolder.mjs'
import fsDeleteFolder from 'wsemi/src/fsDeleteFolder.mjs'
import WDwdataFtp from 'w-dwdata-ftp/src/WDwdataFtp.mjs'
import parseData from './parseData.mjs'


/**
 * 基於檔案之下載台灣氣象署FTP地震數據與任務建構器
 *
 * 執行階段最新hash數據放置於fdDwAttime，前次hash數據會於結束前自動備份至fdDwCurrent
 *
 * 執行階段最新數據放置於fdDwStorageTemp，前次數據放置於fdDwStorage，於結束前會將fdDwStorage清空，將fdDwStorageTemp複製至fdDwStorage
 *
 * @param {String} st 輸入設定FTP連線資訊物件
 * @param {String} [st.transportation='FTP'] 輸入傳輸協定字串，可選'FTP'、'SFTP'，預設'FTP'
 * @param {String} [st.hostname=''] 輸入hostname字串，預設''
 * @param {Integer} [st.port=21|22] 輸入port正整數，當transportation='FTP'預設21，當transportation='SFTP'預設22
 * @param {String} [st.username=''] 輸入帳號字串，預設''
 * @param {String} [st.password=''] 輸入密碼字串，預設''
 * @param {String} [st.fdIni='./'] 輸入同步資料夾字串，預設'./'
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.fdTagRemove='./_tagRemove'] 輸入暫存標記為刪除數據資料夾字串，預設'./_tagRemove'
 * @param {String} [opt.fdDwStorageTemp='./_dwStorageTemp'] 輸入最新下載檔案存放資料夾字串，預設'./_dwStorageTemp'
 * @param {String} [opt.fdDwStorage='./_dwStorage'] 輸入合併儲存檔案資料夾字串，預設'./_dwStorage'
 * @param {String} [opt.fdDwAttime='./_dwAttime'] 輸入當前下載供比對hash用之數據資料夾字串，預設'./_dwAttime'
 * @param {String} [opt.fdDwCurrent='./_dwCurrent'] 輸入已下載供比對hash用之數據資料夾字串，預設'./_dwCurrent'
 * @param {String} [opt.fdResultTemp=`./_resultTemp`] 輸入若有變更數據時，儲存前次已下載數據所連動生成數據資料夾字串，預設`./_resultTemp`
 * @param {String} [opt.fdResult='./_result'] 輸入已下載數據所連動生成數據資料夾字串，預設'./_result'
 * @param {String} [opt.fdTaskCpActualSrc='./_taskCpActualSrc'] 輸入任務狀態之來源端完整資料夾字串，預設'./_taskCpActualSrc'
 * @param {String} [opt.fdTaskCpSrc='./_taskCpSrc'] 輸入任務狀態之來源端資料夾字串，預設'./_taskCpSrc'
 * @param {String} [opt.fdLog='./_logs'] 輸入儲存log資料夾字串，預設'./_logs'
 * @param {Function} [opt.funDownload=null] 輸入當前下載數據hash之函數，回傳資料陣列，預設null
 * @param {Function} [opt.funGetCurrent=null] 輸入已下載數據hash之函數，回傳資料陣列，預設null
 * @param {Function} [opt.funAdd=null] 輸入當有新資料時，需要連動處理之函數，預設null
 * @param {Function} [opt.funModify=null] 輸入當有資料需更新時，需要連動處理之函數，預設null
 * @param {Function} [opt.funRemove=null] 輸入當有資料需刪除時，需要連動處理之函數，預設null
 * @param {Number} [opt.timeToleranceRemove=0] 輸入刪除任務之防抖時長，單位ms，預設0，代表不使用
 * @returns {Object} 回傳事件物件，可呼叫函數on監聽change事件
 * @example
 *
 * import w from 'wsemi'
 * import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'
 *
 * let st = {
 *     'transportation': 'FTP',
 *     'hostname': '{hostname}',
 *     'port': 21,
 *     'username': '{username}',
 *     'password': '{password}',
 *     'fdIni': './'
 * }
 *
 * //fdTagRemove
 * let fdTagRemove = `./_tagRemove`
 * w.fsCleanFolder(fdTagRemove)
 *
 * //fdDwStorageTemp
 * let fdDwStorageTemp = `./_dwStorageTemp`
 * w.fsCleanFolder(fdDwStorageTemp)
 *
 * //fdDwStorage
 * let fdDwStorage = `./_dwStorage`
 * w.fsCleanFolder(fdDwStorage)
 *
 * //fdDwAttime
 * let fdDwAttime = `./_dwAttime`
 * w.fsCleanFolder(fdDwAttime)
 *
 * //fdDwCurrent
 * let fdDwCurrent = `./_dwCurrent`
 * w.fsCleanFolder(fdDwCurrent)
 *
 * //fdResultTemp
 * let fdResultTemp = './_resultTemp'
 * w.fsCleanFolder(fdResultTemp)
 *
 * //fdResult
 * let fdResult = './_result'
 * w.fsCleanFolder(fdResult)
 *
 * //fdTaskCpActualSrc
 * let fdTaskCpActualSrc = `./_taskCpActualSrc`
 * w.fsCleanFolder(fdTaskCpActualSrc)
 *
 * //fdTaskCpSrc
 * let fdTaskCpSrc = `./_taskCpSrc`
 * w.fsCleanFolder(fdTaskCpSrc)
 *
 * let opt = {
 *     fdTagRemove,
 *     fdDwStorageTemp,
 *     fdDwStorage,
 *     fdDwAttime,
 *     fdDwCurrent,
 *     fdResultTemp,
 *     fdResult,
 *     fdTaskCpActualSrc,
 *     fdTaskCpSrc,
 *     // fdLog,
 *     // funDownload,
 *     // funGetCurrent,
 *     // funRemove,
 *     // funAdd,
 *     // funModify,
 * }
 * let ev = await WDwdataTweqmp(st, opt)
 *     .catch((err) => {
 *         console.log(err)
 *     })
 * ev.on('change', (msg) => {
 *     delete msg.type
 *     console.log('change', msg)
 * })
 * // change { event: 'start', msg: 'running...' }
 * // change { event: 'proc-callfun-download', msg: 'start...' }
 * // change { event: 'proc-callfun-download', num: 2, msg: 'done' }
 * // change { event: 'proc-callfun-getCurrent', msg: 'start...' }
 * // change { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' }
 * // change { event: 'proc-compare', msg: 'start...' }
 * // change { event: 'proc-compare', numRemove: 0, numAdd: 2, numModify: 0, numSame: 0, msg: 'done' }
 * // change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'start...' }
 * // change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'done' }
 * // change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'start...' }
 * // change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'done' }
 * // ...
 *
 */
let WDwdataTweqmp = async(st, opt = {}) => {

    // //useExpandOnOldFiles
    // let useExpandOnOldFiles = get(opt, 'useExpandOnOldFiles')
    // if (!isbol(useExpandOnOldFiles)) {
    //     useExpandOnOldFiles = false
    // }

    //useSimulateFiles, 供測試用, 檔案得預先給予至fdDwStorageTemp
    let useSimulateFiles = get(opt, 'useSimulateFiles')
    if (!isbol(useSimulateFiles)) {
        useSimulateFiles = false
    }

    //fdTagRemove, 暫存標記為刪除數據資料夾
    let fdTagRemove = get(opt, 'fdTagRemove')
    if (!isestr(fdTagRemove)) {
        fdTagRemove = `./_tagRemove`
    }

    //fdDwStorageTemp, 最新下載檔案存放資料夾
    let fdDwStorageTemp = get(opt, 'fdDwStorageTemp')
    if (!isestr(fdDwStorageTemp)) {
        fdDwStorageTemp = `./_dwStorageTemp`
    }
    if (!fsIsFolder(fdDwStorageTemp)) {
        fsCreateFolder(fdDwStorageTemp)
    }

    //fdDwStorage, 合併儲存檔案資料夾
    let fdDwStorage = get(opt, 'fdDwStorage')
    if (!isestr(fdDwStorage)) {
        fdDwStorage = `./_dwStorage`
    }
    if (!fsIsFolder(fdDwStorage)) {
        fsCreateFolder(fdDwStorage)
    }

    //fdDwAttime
    let fdDwAttime = get(opt, 'fdDwAttime')
    if (!isestr(fdDwAttime)) {
        fdDwAttime = `./_dwAttime`
    }
    if (!fsIsFolder(fdDwAttime)) {
        fsCreateFolder(fdDwAttime)
    }

    //fdDwCurrent
    let fdDwCurrent = get(opt, 'fdDwCurrent')
    if (!isestr(fdDwCurrent)) {
        fdDwCurrent = `./_dwCurrent`
    }
    if (!fsIsFolder(fdDwCurrent)) {
        fsCreateFolder(fdDwCurrent)
    }

    //fdResultTemp
    let fdResultTemp = get(opt, 'fdResultTemp')
    if (!isestr(fdResultTemp)) {
        fdResultTemp = `./_resultTemp`
    }
    if (!fsIsFolder(fdResultTemp)) {
        fsCreateFolder(fdResultTemp)
    }

    //fdResult
    let fdResult = get(opt, 'fdResult')
    if (!isestr(fdResult)) {
        fdResult = './_result'
    }
    if (!fsIsFolder(fdResult)) {
        fsCreateFolder(fdResult)
    }

    //fdTaskCpActualSrc, 儲存完整任務狀態資料夾
    let fdTaskCpActualSrc = get(opt, 'fdTaskCpActualSrc')
    if (!isestr(fdTaskCpActualSrc)) {
        fdTaskCpActualSrc = `./_taskCpActualSrc`
    }
    if (!fsIsFolder(fdTaskCpActualSrc)) {
        fsCreateFolder(fdTaskCpActualSrc)
    }

    //fdTaskCpSrc
    let fdTaskCpSrc = get(opt, 'fdTaskCpSrc')
    if (!isestr(fdTaskCpSrc)) {
        fdTaskCpSrc = './_taskCpSrc'
    }
    if (!fsIsFolder(fdTaskCpSrc)) {
        fsCreateFolder(fdTaskCpSrc)
    }

    //fdLog
    let fdLog = get(opt, 'fdLog')
    if (!isestr(fdLog)) {
        fdLog = './_logs'
    }
    if (!fsIsFolder(fdLog)) {
        fsCreateFolder(fdLog)
    }

    //funDownload
    let funDownload = get(opt, 'funDownload')

    //funGetCurrent
    let funGetCurrent = get(opt, 'funGetCurrent')

    //funAdd
    let funAdd = get(opt, 'funAdd')

    //funModify
    let funModify = get(opt, 'funModify')

    //funRemove
    let funRemove = get(opt, 'funRemove')

    //timeToleranceRemove
    let timeToleranceRemove = get(opt, 'timeToleranceRemove')
    if (!isp0int(timeToleranceRemove)) {
        timeToleranceRemove = 0
    }
    timeToleranceRemove = cdbl(timeToleranceRemove)

    //funRemoveDef
    let funRemoveDef = async(v) => {

        let fd = `${fdResult}/${v.id}`
        if (fsIsFolder(fd)) {
            fsDeleteFolder(fd)
        }

    }
    if (!isfun(funRemove)) {
        funRemove = funRemoveDef
    }

    //funAddDef
    let funAddDef = async(v) => {

        let fd = `${fdResult}/${v.id}` //使用v.id做為資料夾名
        if (!fsIsFolder(fd)) {
            fsCreateFolder(fd)
        }
        fsCleanFolder(fd)

        //readFileSync
        let fpSrc = `${fdDwStorageTemp}/${v.id}` //新下載檔案存放於fdDwStorageTemp, v.id為數據檔名
        let c = fs.readFileSync(fpSrc, 'utf8')

        //parseData
        let eq = parseData(c)

        //writeFileSync
        let fpTar = `${fd}/${eq.id}.json` //使用eq.id做為檔名
        fs.writeFileSync(fpTar, JSON.stringify(eq), 'utf8')

    }
    if (!isfun(funAdd)) {
        funAdd = funAddDef
    }

    //funModifyDef
    let funModifyDef = async(v) => {

        //複製舊資料夾(含檔案)至fdResultTemp做暫時備份, fdResultTemp會於funAfterStart清空, 於funBeforeEnd刪除
        if (true) {

            let fdSrc = `${fdResult}/${v.id}`
            let fdTar = `${fdResultTemp}/${v.id}`
            fsCopyFolder(fdSrc, fdTar)

        }

        //複製新檔案至fdResult
        if (true) {

            let fd = `${fdResult}/${v.id}` //使用v.id做為資料夾名
            if (!fsIsFolder(fd)) {
                fsCreateFolder(fd)
            }
            fsCleanFolder(fd)

            //readFileSync
            let fpSrc = `${fdDwStorageTemp}/${v.id}` //新下載檔案存放於fdDwStorageTemp, v.id為數據檔名
            let c = fs.readFileSync(fpSrc, 'utf8')

            //parseData
            let eq = parseData(c)

            //writeFileSync
            let fpTar = `${fd}/${eq.id}.json` //使用eq.id做為檔名
            fs.writeFileSync(fpTar, JSON.stringify(eq), 'utf8')

        }

    }
    if (!isfun(funModify)) {
        funModify = funModifyDef
    }

    let funAfterStart = async() => {

        fsCleanFolder(fdResultTemp)

    }

    let funBeforeEnd = async() => {

        fsCleanFolder(fdResultTemp)

    }

    let optFtp = {
        useSimulateFiles,
        useExpandOnOldFiles: true, //為增量檔案
        fdTagRemove,
        fdDwStorageTemp,
        fdDwStorage,
        fdDwAttime,
        fdDwCurrent,
        fdResult,
        fdTaskCpActualSrc,
        fdTaskCpSrc,
        fdLog,
        funDownload,
        funGetCurrent,
        funRemove,
        funAdd,
        funModify,
        funAfterStart,
        funBeforeEnd,
        timeToleranceRemove,
    }
    let ev = await WDwdataFtp(st, optFtp)

    return ev
}


export default WDwdataTweqmp
