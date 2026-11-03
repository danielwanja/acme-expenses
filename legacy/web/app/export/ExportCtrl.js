angular.module('acme').controller('ExportCtrl', ['api', function (api) {
  var vm = this;
  vm.markExported = function () {
    api.post('export.php', {}).then(function (data) {
      vm.done = data.exported;
    }, function (res) {
      vm.error = (res.data && res.data.error) || 'Export failed.';
    });
  };
}]);
