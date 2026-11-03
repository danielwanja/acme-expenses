// Every call goes to the PHP API with the user header the proxy used to add.
angular.module('acme').factory('api', ['$http', function ($http) {
  var current = localStorage.getItem('legacyUser') || 'erin';

  function call(method, endpoint, data, params) {
    return $http({
      method: method,
      url: '../api/' + endpoint,
      data: data,
      params: params,
      headers: { 'X-Legacy-User': current }
    }).then(function (res) { return res.data; });
  }

  return {
    user: function (id) {
      if (id) { current = id; localStorage.setItem('legacyUser', id); }
      return current;
    },
    get: function (endpoint, params) { return call('GET', endpoint, null, params); },
    post: function (endpoint, data) { return call('POST', endpoint, data); }
  };
}]);
