// lib/index.js
function hello() {
  return "hello";
}

// src/counter.ts
function setupCounter(element) {
  let counter = 0;
  const setCounter = (count) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };
  element.addEventListener("click", () => setCounter(counter + 1));
  setCounter(0);
}

// src/other.ts
function other(a, b) {
  return a + b;
}

// publicTypescript/a.ts
var x = other(1, 2);
console.log(x);
var h = hello();
console.log(h);
setupCounter();
