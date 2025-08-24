// import path from 'path'
import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import parseData from './src/parseData.mjs'


let c
let eq
let eqs = []
c = fs.readFileSync(`./test/100000-townshipInt-All.txt`, 'utf8')
eq = parseData(c)
eqs.push(eq)
c = fs.readFileSync(`./test/100001-townshipInt-All.txt`, 'utf8')
eq = parseData(c)
eqs.push(eq)
console.log('eqs', eqs)


//node g.parseData.mjs
