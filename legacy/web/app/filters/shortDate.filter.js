// {{ e.expense_date | shortDate }}  "2026-03-01 00:00:00" -> "Mar 1, 2026"
angular.module('acme').filter('shortDate', function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return function (value) {
    if (!value) return '';
    var parts = String(value).substr(0, 10).split('-');
    if (parts.length !== 3) return String(value);
    return MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10) + ', ' + parts[0];
  };
});
