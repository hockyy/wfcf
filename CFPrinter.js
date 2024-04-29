// ==UserScript==
// @name         CF Printer
// @version      1.0
// @author       hocky
// @match        https://codeforces.com/problemset/problem/*
// @match        https://codeforces.com/contest/*/problem/*
// @match        https://codeforces.com/blog/entry/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=codeforces.com
// @grant        none
// ==/UserScript==

// https://gist.github.com/TianyiChen/329edfd7c02327c2a0c9e1307816abb8
(function() {
    'use strict';
    $('#sidebar').hide();
    $('#header').hide();
    $('#footer').hide();
    $('.menu-box').hide();
    const problemTitle = $('.problem-statement .header .title')
    console.log(problemTitle.text());
    const newTitle = problemTitle.text().replace(/^\S\. /, '');
    problemTitle.text(newTitle);
    $('.problem-statement .header .input-file').hide();
    $('.problem-statement .header .output-file').hide();
    // $('.second-level-menu').hide();
    $('#pageContent').removeClass("content-with-sidebar");
    // print();
    setInterval(() => {
        $('.alert.alert-info.diff-notifier').hide();
    }, 1000);
    // Your code here...
})();
