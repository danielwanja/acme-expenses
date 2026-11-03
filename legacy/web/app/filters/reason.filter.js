// {{ e.rejection_reason | reason }}  Trims, capitalizes, and ends with a period
angular.module('acme').filter('reason', function () {
  return function (text) {
    if (!text || !String(text).trim()) return 'No reason given';
    var t = String(text).trim();
    t = t.charAt(0).toUpperCase() + t.substr(1);
    return /[.!?]$/.test(t) ? t : t + '.';
  };
});
