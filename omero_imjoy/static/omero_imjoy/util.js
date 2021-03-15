
function getUrlParameter(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(location.search);
    return results === null
        ? ""
        : decodeURIComponent(results[1].replace(/\+/g, " "));
}
// get URL param as list. e.g. ?open=1&open=2
function getUrlParameterList(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp(name + "=([^#]*)");
    var results = location.search.slice(1).split('&')
        .map(search => regex.exec(search))
        .filter(Boolean)
        .map(r => r[1].replace(/\+/g, " "));
    return results;
}

async function fetchJSON(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

function getBaseUrl() {
    return window.location.href.split('/imjoy/')[0];
}

function range(length) {
    return Array.from({ length }, (_, i) => i);
}

function mergeArrays(arrays) {
    // Get the total length of all arrays.
    let length = 0;
    arrays.forEach(item => {
        length += item.length;
    });

    // Create a new array with total length and merge all source arrays.
    // Use first Array.constructor - output Array will be same type
    // e.g. Int16Array -> Int16Array
    let mergedArray = new arrays[0].constructor(length);
    let offset = 0;
    arrays.forEach(item => {
        mergedArray.set(item, offset);
        offset += item.length;
    });
    return mergedArray;
}

async function getStore() {
    const url = 'https://unpkg.com/@manzt/zarr-lite/httpStore.js';
    const {
        default: HTTPStore
    } = await import(url);
    return HTTPStore;
}
