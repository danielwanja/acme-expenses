angular.module('acme', ['ngRoute'])
  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider
      .when('/expenses', {
        templateUrl: 'app/expenses/list/list.html',
        controller: 'ExpenseListCtrl', controllerAs: 'vm'
      })
      .when('/expenses/new', {
        templateUrl: 'app/expenses/edit/edit.html',
        controller: 'ExpenseEditCtrl', controllerAs: 'vm'
      })
      .when('/expenses/:id/edit', {
        templateUrl: 'app/expenses/edit/edit.html',
        controller: 'ExpenseEditCtrl', controllerAs: 'vm'
      })
      .when('/expenses/:id/submit', {
        templateUrl: 'app/expenses/submit/submit.html',
        controller: 'SubmitCtrl', controllerAs: 'vm'
      })
      .when('/approvals', {
        templateUrl: 'app/approvals/approvals.html',
        controller: 'ApprovalQueueCtrl', controllerAs: 'vm'
      })
      .when('/export', {
        templateUrl: 'app/export/export.html',
        controller: 'ExportCtrl', controllerAs: 'vm'
      })
      .otherwise('/expenses');
  }])
  .controller('ShellCtrl', ['$route', 'api', function ($route, api) {
    var shell = this;
    shell.users = ['erin', 'sam', 'zoe', 'max', 'lee'];
    shell.user = api.user();
    shell.switchUser = function () {
      api.user(shell.user);
      $route.reload();
    };
  }]);
