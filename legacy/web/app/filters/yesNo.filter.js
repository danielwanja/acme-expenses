// {{ flag | yesNo }}  MySQL booleans arrive as "1"/"0" strings
angular.module('acme').filter('yesNo', function () {
  return function (value) {
    return value === true || value === 1 || value === '1' ? 'Yes' : 'No';
  };
});
