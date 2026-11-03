angular.module('acme').controller('ExpenseEditCtrl', ['$routeParams', '$location', 'api',
  function ($routeParams, $location, api) {
    var vm = this;
    vm.currencies = ['USD', 'EUR', 'GBP', 'JPY'];
    vm.categories = ['MEALS', 'TRAVEL', 'OFFICE', 'OTHER'];
    vm.form = { currency: 'USD', category: 'MEALS' };
    vm.fields = {};

    if ($routeParams.id) {
      // expense.php has the amount and status; the list has the rest.
      api.get('expense.php', { id: $routeParams.id }).then(function (e) {
        vm.form.id = e.id;
        vm.form.amount = e.amount;
        vm.form.currency = e.currency;
        vm.form.expense_date = e.expense_date.substr(0, 10);
        vm.status = e.status;
        return api.get('expenses.php');
      }).then(function (rows) {
        rows.forEach(function (row) {
          if (row.id === vm.form.id) {
            vm.form.category = row.category;
            vm.form.note = row.note;
            vm.rejection = row.rejection_reason;
          }
        });
      }, function (res) {
        vm.error = (res.data && res.data.error) || 'Could not load the expense.';
      });
    }

    vm.save = function () {
      vm.error = null;
      vm.fields = {};
      api.post('save.php', vm.form).then(function () {
        $location.path('/expenses');
      }, function (res) {
        vm.error = (res.data && res.data.error) || 'Save failed.';
        vm.fields = (res.data && res.data.fields) || {};
      });
    };
  }]);
