import fs from 'fs'
import each from 'lodash-es/each.js'
import size from 'lodash-es/size.js'
import fsCleanFolder from 'wsemi/src/fsCleanFolder.mjs'
import WFtp from 'w-ftp/src/WFtp.mjs'
import fsTreeFolder from 'wsemi/src/fsTreeFolder.mjs'
import fsCopyFile from 'wsemi/src/fsCopyFile.mjs'


let downloadFiles = async(st, fdDwStorageTxtTemp, fdDwStorageTxt) => {
    let errTemp = null

    //core
    let core = async() => {

        //fsCleanFolder
        fsCleanFolder(fdDwStorageTxtTemp)

        //ftp
        let ftp = WFtp({
            ...st,
            transportation: 'SFTP',
            timeLimit: 100 * 1000, //100s
        })
        // console.log('ftp', ftp)

        //conn
        await ftp.conn()

        //syncFiles
        let syncFiles = async () => {

            //ls
            // let fps = await ftp.ls('.')
            let fps = await ftp.ls(st.fdIni)
            // console.log('ftp.ls', fps[0], fps.length)
            console.log('ftp.ls', fps.length)

            //syncToLocal
            let r = await ftp.syncToLocal(
                st.fdIni,
                fdDwStorageTxtTemp,
                (p) => {
                    console.log('ftp.syncToLocal p', p.name, p.progress)
                },
                {
                    forceOverwriteWhenSync: true, //強制全下載進行複寫本機數據
                },
            )
            console.log('ftp.syncToLocal r', r)

        }
        await syncFiles()
            .catch((err) => { //須catch, 避免操作指令失敗造成程序中止
                console.log(err)
            })

        //quit
        let r = await ftp.quit()
        console.log('ftp.quit', r)

    }

    //core
    await core()
        .catch((err) => { //須再catch, 避免無法連線SFTP時中止程序
            console.log(err)
            errTemp = err
        })

    //check
    if (errTemp !== null) {
        if (errTemp instanceof Error) {
            throw errTemp
        }
        else {
            throw new Error(String(errTemp))
        }
    }

    //vfps
    let vfps = fsTreeFolder(fdDwStorageTxtTemp, 1)
    // console.log('vfps', vfps)

    //check
    if (size(vfps) === 0) {
        errTemp = 'no files'
        throw new Error(errTemp)
    }

    //items
    let items = []
    each(vfps, (v) => {
        try {
            let c = fs.readFileSync(v.path, 'utf8')
            items.push(c)
        }
        catch (err) {
            console.log(err)
            errTemp = err
            return false //跳出
        }
    })
    // console.log('items', items)

    //check
    if (errTemp !== null) {
        if (errTemp instanceof Error) {
            throw errTemp
        }
        else {
            throw new Error(String(errTemp))
        }
    }

    //複製fdDwStorageTxtTemp內所下載txt檔案至合併儲存資料夾fdDwStorageTxt
    each(vfps, (v) => {

        //fsCopyFile
        let fpSrc = v.path
        let fpTar = `${fdDwStorageTxt}/${v.name}`
        let r = fsCopyFile(fpSrc, fpTar)

        //check
        if (r.error) {
            console.log(r.error)
            errTemp = r.error
            return false //跳出
        }

    })

    //check
    if (errTemp !== null) {
        if (errTemp instanceof Error) {
            throw errTemp
        }
        else {
            throw new Error(String(errTemp))
        }
    }

    return items
}


export default downloadFiles
