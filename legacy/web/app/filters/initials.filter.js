// {{ e.owner_name | initials }}  "Erin Shaw" -> "ES", "Madonna" -> "M"
angular.module('acme').filter('initials', function () {
  return function (name) {
    if (!name) return '?';
    var words = String(name).trim().split(/\s+/);
    var first = words[0].charAt(0);
    var last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  };
});
