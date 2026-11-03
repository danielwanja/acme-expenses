angular.module('acme').controller('SubmitCtrl', ['$routeParams', '$location', 'api',
  function ($routeParams, $location, api) {
    var vm = this;
    api.get('expense.php', { id: $routeParams.id }).then(function (e) {
      vm.expense = e;
      return api.get('fx_rates.php', { month: e.expense_date.substr(0, 7) });
    }).then(function (fx) {
      vm.month = fx.month;
      var rate = fx.rates[vm.expense.currency];
      // An estimate only: approval converts with the month's rate.
      vm.estimate = rate ? parseFloat(vm.expense.amount.replace(/,/g, '')) * rate : null;
    });

    vm.submit = function () {
      api.post('submit.php', { id: $routeParams.id }).then(function () {
        $location.path('/expenses');
      }, function (res) {
        vm.error = (res.data && res.data.error) || 'Submit failed.';
      });
    };
  }]);
