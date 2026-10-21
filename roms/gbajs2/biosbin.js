(function() {
    function _base64ToArrayBuffer(base64) {
        var clean = base64.replace(/[^A-Za-z0-9+/=]/g, "");
        var binary_string = (typeof window !== "undefined" && window.atob) ? window.atob(clean) : (typeof atob !== "undefined" ? atob(clean) : "");
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
    var b64 = "BgAA6v7//+oFAADq/v//6v7//+oAAKDhDAAA6v7//+oC86DjAABd4wHToAMg0E0CAEAt6QIAXuUEAFDjCQAACwUAUOMHAAALAEC96A7wsOEPUC3pAQOg4wDgj+IE8BDlD1C96ATwXuIQQC3pBNBN4rAQzeEBQ6DjAkyE4rAA1OGyAM3hsBDd4QEAgOGwAMThAUOg4x8AoOMA8CnhAACg4wEDxOXTAKDjAPAp4bgAVOGwEN3hABAR4AAQIRC4EEQR8///CgFDoOMCTITisgDd4bAAxOEE0I3iEIC96A==";
    var buf = _base64ToArrayBuffer(b64);
    if (typeof window !== "undefined") {
        window.biosBin = buf;
    }
    if (typeof globalThis !== "undefined") {
        globalThis.biosBin = buf;
    }
})();
var biosBin = (typeof window !== "undefined" && window.biosBin) ? window.biosBin : (typeof globalThis !== "undefined" ? globalThis.biosBin : null);
