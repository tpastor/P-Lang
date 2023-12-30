export function makeGet(url) {
    const request = require('sync-request');
    return request('GET', url);
}

export function makePost(url, json?) {
    const request = require('sync-request');
    return request('POST', url, { json: json, });
}