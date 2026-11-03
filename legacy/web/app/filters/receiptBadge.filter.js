// {{ e.receipt_path | receiptBadge }}  "receipts/1042.pdf" -> "PDF", ".jpg" -> "Image"
angular.module('acme').filter('receiptBadge', function () {
  return function (path) {
    if (!path) return 'Missing';
    var ext = String(path).split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'Image';
    return 'File';
  };
});
