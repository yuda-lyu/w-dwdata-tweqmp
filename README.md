# w-dwdata-tweqmp
A downloader for earthquake PGA data from Taiwan CWA.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-dwdata-tweqmp.svg?style=flat)](https://npmjs.org/package/w-dwdata-tweqmp) 
[![license](https://img.shields.io/npm/l/w-dwdata-tweqmp.svg?style=flat)](https://npmjs.org/package/w-dwdata-tweqmp) 
[![npm download](https://img.shields.io/npm/dt/w-dwdata-tweqmp.svg)](https://npmjs.org/package/w-dwdata-tweqmp) 
[![npm download](https://img.shields.io/npm/dm/w-dwdata-tweqmp.svg)](https://npmjs.org/package/w-dwdata-tweqmp) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-dwdata-tweqmp.svg)](https://www.jsdelivr.com/package/npm/w-dwdata-tweqmp)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-dwdata-tweqmp/global.html).

## Installation

### Using npm(ES6 module):
```alias
npm i w-dwdata-tweqmp
```

#### Example:
> **Link:** [[dev source code](https://github.com/yuda-lyu/w-dwdata-tweqmp/blob/master/g.mjs)]
```alias
import w from 'wsemi'
import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'

let st = {
    'transportation': 'FTP',
    'hostname': '{hostname}',
    'port': 21,
    'username': '{username}',
    'password': '{password}',
    'fdIni': './'
}

//fdTagRemove
let fdTagRemove = `./_tagRemove`
w.fsCleanFolder(fdTagRemove)

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

//fdTaskCpActualSrc
let fdTaskCpActualSrc = `./_taskCpActualSrc`
w.fsCleanFolder(fdTaskCpActualSrc)

//fdTaskCpSrc
let fdTaskCpSrc = `./_taskCpSrc`
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
    console.log('change', msg)
})
// change { event: 'start', msg: 'running...' }
// change { event: 'proc-callfun-download', msg: 'start...' }
// change { event: 'proc-callfun-download', num: 2, msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' }
// change { event: 'proc-compare', msg: 'start...' }
// change { event: 'proc-compare', numRemove: 0, numAdd: 2, numModify: 0, numSame: 0, msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'done' }
// ...
```

#### Incomplete data files (e.g. truncated by an interrupted transfer)
**Behavior change:** `parseData(c)` now throws synchronously when the content is incomplete or unexpected (not a string, containing NUL or U+FFFD characters, no or more than one observation time line, a malformed or non-existent observation time, an incomplete station record, no station record, or not ending with a line break). It no longer returns an object whose `id` is `'Invalid Date'`, a wrong time, or a result with missing stations. The error message is a fixed phrase that never echoes the content. There is no option to keep the old behavior.

Use `checkData(c)` to validate without throwing. It returns `{ ok, msg }`, where `msg` is `''` when the content is valid, and `parseData` throws exactly the same `msg`:
```alias
import checkData from 'w-dwdata-tweqmp/src/checkData.mjs'
import parseData from 'w-dwdata-tweqmp/src/parseData.mjs'

let r = checkData(c)
if (r.ok) {
    let eq = parseData(c)
}
else {
    console.log(r.msg) // 'invalid c: must end with a line break', etc.
}
```
The default `funAdd` and `funModify` of `WDwdataTweqmp` check the file before touching the result folder. An incomplete file is skipped: nothing is written, the existing result is kept, and the other files of the same run are still processed. The skip is reported through a `change` event with `type: 'error'` (`event` is `'proc-add-check-data'` or `'proc-diff-check-data'`, with `id` and `msg`), `srLog.error`, and, when `useShowLog` is true, one line on the console; these three channels are independent of each other. The skipped file stays in the storage folder; when the remote file is downloaded again and its hash differs, it is processed as a modification and the result is replaced.

If you pass your own `funAdd` or `funModify` that calls `parseData`, an incomplete file makes `parseData` throw, which makes the scheduler used by `w-dwdata-ftp` (`w-data-scheduler`) cancel the remaining files of that run; catch the error yourself or call `checkData` first.

A skipped new file is still recorded as processed in the task list (`fdTaskCpSrc`) by the scheduler, so a consumer that follows the task list must use the `type: 'error'` event to know that no result folder exists for that file.

Limitation: a file truncated exactly at a line break after at least one station record has the same structure as a complete file with fewer stations, so it cannot be detected from the content. Verify the file size (or the station count the data source is expected to provide) in the download layer or in your application.
