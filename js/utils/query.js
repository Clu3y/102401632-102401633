window.LF = window.LF || {};
(function (LF) {
  function decode(text) {
    try { return decodeURIComponent(text.replace(/\+/g, ' ')); }
    catch (_) { return text; }
  }
  function parse(text) {
    var result = {};
    String(text || '').replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var index = pair.indexOf('=');
      var key = decode(index < 0 ? pair : pair.slice(0, index));
      if (['__proto__', 'constructor', 'prototype'].indexOf(key) >= 0) return;
      result[key] = decode(index < 0 ? '' : pair.slice(index + 1));
    });
    return result;
  }
  function stringify(values) {
    return Object.keys(values).filter(function (key) { return values[key] !== '' && values[key] != null; })
      .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(values[key]); }).join('&');
  }
  LF.query = { parse: parse, stringify: stringify };
})(window.LF);
