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
import w from 'wsemi'
import WDwdataTweqmp from './src/WDwdataTweqmp.mjs'

let st = {
    'hostname': '{hostname}',
    'port': 21,
    'username': '{username}',
    'password': '{password}',
    'fdIni': './'
}

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

//fdResult
let fdResult = './_result'
w.fsCleanFolder(fdResult)

let opt = {
    fdDwStorageTemp,
    fdDwStorage,
    fdDwAttime,
    fdDwCurrent,
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
    console.log('change', msg)
})
// change { event: 'start', msg: 'running...' }
// change { event: 'proc-callfun-download', msg: 'start...' }
// change { event: 'proc-callfun-download', num: 2, msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' }
// change { event: 'compare', msg: 'start...' }
// change { event: 'compare', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '100000-townshipInt-All.txt', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '100001-townshipInt-All.txt', msg: 'done' }
// ...
```
