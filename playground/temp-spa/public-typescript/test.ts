const foo = {
  get bar() {
    return this._bar
  },
  set bar(value) {
    this._bar = value
  },
}

const a = 1

foo.bar = '123'

const n = { a: 1, b: 2 }

const { b } = n

console.log(b, 'b', a, 'a')
