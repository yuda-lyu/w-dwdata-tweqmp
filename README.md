# w-dwdata-tweqmp
A download tool for earthquake ML and PGA data from Taiwan CWA.

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
import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'

let st = {
    'hostname': '{hostname}',
    'port': 21,
    'username': '{username}',
    'password': '{password}',
    'fdIni': './'
}

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

let opt = {
    fdDwStorageTxtTemp,
    fdDwStorageTxt,
    fdDwStorageJson,
    fdDwAttime,
    fdDwCurrent,
    fdResult,
    // funDownloadEqs,
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
```
