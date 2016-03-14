<?php
// File Name: proxy.php

if(!isset($_GET['url'])) die();

$url = $_GET['url'];
$url = urldecode($url);
$url = file_get_contents($url);

print_r($url);
