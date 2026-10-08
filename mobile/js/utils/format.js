/* format.js — 时间格式化（对应小程序 utils/format.js） */
window.LF = window.LF || {};

(function (LF) {
  /**
   * 解析时间字符串为 Date 对象
   * 后端返回格式：2026-09-27T10:30:00 或 2026-09-27 10:30:00
   */
  function parseDate(iso) {
    if (!iso) return null;
    var str = String(iso).replace(/-/g, '/').replace('T', ' ');
    var d = new Date(str);
    if (isNaN(d.getTime())) {
      var d2 = new Date(iso);
      return isNaN(d2.getTime()) ? null : d2;
    }
    return d;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  /** "MM月DD日 HH:mm" */
  function formatDateTime(iso) {
    var d = parseDate(iso);
    if (!d) return '';
    return pad2(d.getMonth() + 1) + '月' + pad2(d.getDate()) + '日 ' +
      pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /** "YYYY年MM月DD日 HH:mm" */
  function formatDateTimeFull(iso) {
    var d = parseDate(iso);
    if (!d) return '';
    return d.getFullYear() + '年' + pad2(d.getMonth() + 1) + '月' + pad2(d.getDate()) + '日 ' +
      pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /** "MM-DD HH:mm" */
  function formatDateTimeShort(iso) {
    var d = parseDate(iso);
    if (!d) return '';
    return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
      pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /** 相对时间：刚刚 / x分钟前 / x小时前 / x天前 / 具体日期 */
  function formatRelative(iso) {
    var d = parseDate(iso);
    if (!d) return '';
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + '天前';
    return formatDateTime(iso);
  }

  /** 当前时间 "YYYY-MM-DD HH:mm"（预留工具） */
  function nowForPicker() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  LF.format = {
    parseDate: parseDate,
    formatDateTime: formatDateTime,
    formatDateTimeFull: formatDateTimeFull,
    formatDateTimeShort: formatDateTimeShort,
    formatRelative: formatRelative,
    nowForPicker: nowForPicker
  };
})(window.LF);
