(function() {
  // ../../node_modules/.pnpm/throttle-debounce@5.0.0/node_modules/throttle-debounce/esm/index.js
  function throttle(delay, callback, options) {
    var _ref = options || {}, _ref$noTrailing = _ref.noTrailing, noTrailing = _ref$noTrailing === void 0 ? false : _ref$noTrailing, _ref$noLeading = _ref.noLeading, noLeading = _ref$noLeading === void 0 ? false : _ref$noLeading, _ref$debounceMode = _ref.debounceMode, debounceMode = _ref$debounceMode === void 0 ? void 0 : _ref$debounceMode;
    var timeoutID;
    var cancelled = false;
    var lastExec = 0;
    function clearExistingTimeout() {
      if (timeoutID) {
        clearTimeout(timeoutID);
      }
    }
    function cancel(options2) {
      var _ref2 = options2 || {}, _ref2$upcomingOnly = _ref2.upcomingOnly, upcomingOnly = _ref2$upcomingOnly === void 0 ? false : _ref2$upcomingOnly;
      clearExistingTimeout();
      cancelled = !upcomingOnly;
    }
    function wrapper() {
      for (var _len = arguments.length, arguments_ = new Array(_len), _key = 0; _key < _len; _key++) {
        arguments_[_key] = arguments[_key];
      }
      var self = this;
      var elapsed = Date.now() - lastExec;
      if (cancelled) {
        return;
      }
      function exec() {
        lastExec = Date.now();
        callback.apply(self, arguments_);
      }
      function clear() {
        timeoutID = void 0;
      }
      if (!noLeading && debounceMode && !timeoutID) {
        exec();
      }
      clearExistingTimeout();
      if (debounceMode === void 0 && elapsed > delay) {
        if (noLeading) {
          lastExec = Date.now();
          if (!noTrailing) {
            timeoutID = setTimeout(debounceMode ? clear : exec, delay);
          }
        } else {
          exec();
        }
      } else if (noTrailing !== true) {
        timeoutID = setTimeout(debounceMode ? clear : exec, debounceMode === void 0 ? delay - elapsed : delay);
      }
    }
    wrapper.cancel = cancel;
    return wrapper;
  }
  function debounce(delay, callback, options) {
    var _ref = options || {}, _ref$atBegin = _ref.atBegin, atBegin = _ref$atBegin === void 0 ? false : _ref$atBegin;
    return throttle(delay, callback, {
      debounceMode: atBegin !== false
    });
  }

  // ../../node_modules/.pnpm/modern-flexible@0.0.7/node_modules/modern-flexible/dist/index.js
  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
    if (!it) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it)
          o = it;
        var i = 0;
        var F = function F2() {
        };
        return { s: F, n: function n() {
          if (i >= o.length)
            return { done: true };
          return { done: false, value: o[i++] };
        }, e: function e(_e) {
          throw _e;
        }, f: F };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    var normalCompletion = true, didErr = false, err;
    return { s: function s() {
      it = it.call(o);
    }, n: function n() {
      var step = it.next();
      normalCompletion = step.done;
      return step;
    }, e: function e(_e2) {
      didErr = true;
      err = _e2;
    }, f: function f() {
      try {
        if (!normalCompletion && it.return != null)
          it.return();
      } finally {
        if (didErr)
          throw err;
      }
    } };
  }
  function _unsupportedIterableToArray(o, minLen) {
    if (!o)
      return;
    if (typeof o === "string")
      return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor)
      n = o.constructor.name;
    if (n === "Map" || n === "Set")
      return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
      return _arrayLikeToArray(o, minLen);
  }
  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length)
      len = arr.length;
    for (var i = 0, arr2 = new Array(len); i < len; i++)
      arr2[i] = arr[i];
    return arr2;
  }
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = function __defNormalProp2(obj, key, value) {
    return key in obj ? __defProp(obj, key, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: value
    }) : obj[key] = value;
  };
  var __spreadValues = function __spreadValues2(a, b) {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols) {
      var _iterator = _createForOfIteratorHelper(__getOwnPropSymbols(b)), _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done; ) {
          var prop = _step.value;
          if (__propIsEnum.call(b, prop))
            __defNormalProp(a, prop, b[prop]);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
    return a;
  };
  var __spreadProps = function __spreadProps2(a, b) {
    return __defProps(a, __getOwnPropDescs(b));
  };
  function genErrorMsg(msg) {
    return "[modern-flexible]: ".concat(msg);
  }
  var PX_UNIT = "px";
  var DEFAULT_OPTIONS = {
    rootValue: 16,
    resizeOption: {
      type: "debounce",
      delay: 60
    },
    distinctDevice: [{
      deviceWidthRange: [0, Number.POSITIVE_INFINITY],
      isDevice: true,
      UIWidth: 375
    }]
  };
  function flexible() {
    var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new TypeError(genErrorMsg("current environment is not browser"));
    }
    options = __spreadValues(__spreadValues({}, DEFAULT_OPTIONS), options);
    var _options = options, rootValue = _options.rootValue, resizeOption = _options.resizeOption, distinctDevice = _options.distinctDevice;
    if (!rootValue || rootValue <= 0) {
      throw new Error(genErrorMsg("rootValue must be greater than 0"));
    }
    if (!distinctDevice || !distinctDevice.length) {
      throw new Error(genErrorMsg("distinctDevice needed"));
    }
    function resize2() {
      var width = window.document.documentElement.clientWidth;
      var defaultDevice = distinctDevice[distinctDevice.length - 1];
      var currentDevice = distinctDevice.find(function(device) {
        return typeof device.isDevice === "boolean" ? device.isDevice : device.isDevice(width);
      }) || defaultDevice;
      if (currentDevice == null ? void 0 : currentDevice.isDevice) {
        if (currentDevice.deviceWidthRange.length !== 2) {
          throw new Error(genErrorMsg("deviceWidthRange length must be 2"));
        }
        if (width >= currentDevice.deviceWidthRange[1]) {
          width = currentDevice.deviceWidthRange[1];
        } else if (width <= currentDevice.deviceWidthRange[0]) {
          width = currentDevice.deviceWidthRange[0];
        }
        if (document.documentElement) {
          document.documentElement.style.fontSize = "".concat(width / currentDevice.UIWidth * rootValue).concat(PX_UNIT);
        }
      } else {
        throw new Error(genErrorMsg("no device matched"));
      }
    }
    resize2();
    function enhanceResize() {
      var _a, _b;
      if (resizeOption === false || !resizeOption) {
        return resize2;
      }
      if (typeof resizeOption !== "object") {
        throw new TypeError(genErrorMsg("resizeOption must be object"));
      }
      if ((resizeOption == null ? void 0 : resizeOption.type) === "debounce") {
        return debounce(resizeOption.delay, resize2, resizeOption.options);
      }
      if ((resizeOption == null ? void 0 : resizeOption.type) === "throttle") {
        return throttle(resizeOption.delay, resize2, __spreadProps(__spreadValues({}, resizeOption.options), {
          noLeading: (_b = (_a = resizeOption.options) == null ? void 0 : _a.noLeading) != null ? _b : true
        }));
      }
      return resize2;
    }
    var enhancedResize = enhanceResize();
    window.addEventListener("resize", enhancedResize);
    window.addEventListener("pageshow", function(e) {
      if (e.persisted) {
        enhancedResize();
      }
    });
    window.addEventListener("pushState", enhancedResize);
    return {
      resize: resize2,
      enhancedResize: enhancedResize
    };
  }

  // public-typescript/test.ts
  var _flexible = flexible({
    rootValue: 16,
    distinctDevice: [{
      deviceWidthRange: [375, 750],
      UIWidth: 375,
      isDevice: function isDevice(w) {
        return w <= 767;
      }
    }, {
      deviceWidthRange: [1535, 1920],
      UIWidth: 1920,
      isDevice: function isDevice2(w) {
        return w > 767;
      }
    }]
  });
  var resize = _flexible.resize;
  window.resize = resize;
})();
