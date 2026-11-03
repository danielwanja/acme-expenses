// {{ fx.month | monthLabel }}  "2026-03" -> "March 2026"
angular.module('acme').filter('monthLabel', function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];
  return function (month) {
    var m = /^(\d{4})-(\d{2})$/.exec(month || '');
    if (!m) return month || '';
    return MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
  };
});
