// {{ e.amount | money:e.currency }}  "1,234.50" + "EUR" -> "€1,234.50"
angular.module('acme').filter('money', ['currencySymbolFilter', function (currencySymbol) {
  return function (amount, currency) {
    if (amount === null || amount === undefined || amount === '') return '';
    var text = String(amount);
    if (text.charAt(0) === '-') return '-' + currencySymbol(currency) + text.substr(1);
    return currencySymbol(currency) + text;
  };
}]);
