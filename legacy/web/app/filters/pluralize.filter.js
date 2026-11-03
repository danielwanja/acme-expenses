// {{ count | pluralize:'expense' }}  0 -> "No expenses", 1 -> "1 expense", 3 -> "3 expenses"
angular.module('acme').filter('pluralize', function () {
  return function (count, word) {
    var n = parseInt(count, 10) || 0;
    if (n === 0) return 'No ' + word + 's';
    return n + ' ' + word + (n === 1 ? '' : 's');
  };
});
