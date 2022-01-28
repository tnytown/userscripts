// ==UserScript==
// @name        MyU Session Refresh
// @namespace   tny
// @match       https://www.myu.umn.edu/*
// @grant       none
// @version     1.0
// @author      -
// @description 1/28/2022, 1:29:42 AM
// ==/UserScript==

const REFRESH_ENDPOINT = 'https://www.myu.umn.edu/psp/psprd/EMPLOYEE/EMPL/?cmd=resettimeout';

let self = setInterval(() => {
    fetch(new Request(REFRESH_ENDPOINT)).catch(() => clearInterval(self))
}, 30 * 60 * 1000);
