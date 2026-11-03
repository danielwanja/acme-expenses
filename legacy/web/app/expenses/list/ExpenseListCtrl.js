angular.module('acme').controller('ExpenseListCtrl', ['api', function (api) {
  var vm = this;
  vm.loading = true;
  api.get('expenses.php').then(function (rows) {
    vm.expenses = rows;
  }, function () {
    vm.error = 'Could not load your expenses.';
  }).finally(function () {
    vm.loading = false;
  });
}]);
