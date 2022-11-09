import { hello } from 'lib'
import { other, setupCounter } from '@/other'

const x = other(1, 2)
console.log(x)

const h = hello()

console.log(h)

setupCounter()
