(function() {
  // public-typescript/test.ts
  var foo = Object.defineProperties({}, {
    bar: {
      get: function get() {
        return this._bar;
      },
      set: function set(value) {
        this._bar = value;
      },
      configurable: true,
      enumerable: true
    }
  });
  var a = 1;
  foo.bar = "123";
  var n = {
    a: 1,
    b: 2
  };
  var b = n.b;
  console.log(b, "b", a, "a");
})();
