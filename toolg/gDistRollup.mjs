import rollupFiles from 'w-package-tools/src/rollupFiles.mjs'
import getFiles from 'w-package-tools/src/getFiles.mjs'


let fdSrc = './src'
let fdTar = './dist'


rollupFiles({
    fns: 'WDwdataTweqmp.mjs',
    fdSrc,
    fdTar,
    // nameDistType: 'kebabCase',
    hookNameDist: () => {
        return 'w-dwdata-tweqmp'
    },
    globals: {

        'path': 'path',
        'fs': 'fs',
        'crypto': 'crypto',
        'events': 'events',
        'chokidar': 'chokidar',

        'net': 'net',
        'util': 'util',
        'stream': 'stream',
        'stream-combiner': 'stream-combiner',
        'ftp-response-parser': 'ftp-response-parser',
        'parse-listing': 'parse-listing',
        'once': 'once',
        'unorm': 'unorm',
        'debug': 'debug',
        'ssh2-sftp-client': 'ssh2-sftp-client',

    },
    external: [

        'path',
        'fs',
        'crypto',
        'events',
        'chokidar',

        'net',
        'util',
        'stream',
        'stream-combiner',
        'ftp-response-parser',
        'parse-listing',
        'once',
        'unorm',
        'debug',
        'ssh2-sftp-client',

    ],
})

