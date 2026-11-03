// {{ e.status | status }}  "0".."4" from the status column -> a label
angular.module('acme').filter('status', function () {
  var LABELS = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Exported'];
  return function (status) {
    var label = LABELS[parseInt(status, 10)];
    return label || 'Unknown';
  };
});
