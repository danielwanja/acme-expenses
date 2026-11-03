angular.module('acme').controller('ApprovalQueueCtrl', ['api', function (api) {
  var vm = this;
  vm.rejecting = null;

  function load() {
    vm.loading = true;
    api.get('queue.php').then(function (data) {
      vm.me = data.me;
      vm.items = data.items;
    }, function (res) {
      vm.error = (res.data && res.data.error) || 'Could not load the queue.';
    }).finally(function () {
      vm.loading = false;
    });
  }

  vm.approve = function (e) {
    api.post('approve.php', { id: e.id, action: 'approve' }).then(load, function (res) {
      vm.error = res.data.error;
    });
  };

  vm.reject = function (e, reason) {
    api.post('approve.php', { id: e.id, action: 'reject', reason: reason }).then(function () {
      vm.rejecting = null;
      load();
    }, function (res) {
      vm.error = res.data.error;
    });
  };

  load();
}]);
