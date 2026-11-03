// {{ e.currency | currencySymbol }}  "EUR" -> "€"; unknown codes get a trailing space
angular.module('acme').filter('currencySymbol', function () {
  var SYMBOLS = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
  return function (code) {
    if (!code) return '$';
    return SYMBOLS[code] || code + ' ';
  };
});
