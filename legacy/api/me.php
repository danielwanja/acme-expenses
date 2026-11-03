<?php
// GET me.php  Who the proxy says you are.
require __DIR__ . '/lib.php';

$me = current_user();
json_out(['id' => $me['id'], 'name' => $me['name'], 'role' => $me['role']]);
