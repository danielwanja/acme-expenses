// {{ e.note | truncate:40 }}  Cuts long text at a word boundary and adds "..."
angular.module('acme').filter('truncate', function () {
  return function (text, max) {
    if (!text) return '';
    max = max || 30;
    if (text.length <= max) return text;
    var cut = text.substr(0, max);
    var space = cut.lastIndexOf(' ');
    if (space > max / 2) cut = cut.substr(0, space);
    return cut + '...';
  };
});
