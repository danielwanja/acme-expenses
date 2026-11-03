// {{ e.category | category }}  "MEALS" -> "Meals"; unknown codes pass through
angular.module('acme').filter('category', function () {
  var NAMES = { MEALS: 'Meals', TRAVEL: 'Travel', OFFICE: 'Office supplies', OTHER: 'Other' };
  return function (code) {
    if (!code) return '';
    return NAMES[String(code).toUpperCase()] || code;
  };
});
