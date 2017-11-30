/**
 * MangoPay Client Utility Class
 */

import Base64 from 'base-64';

export default class Util {

    constructor() {
        this.crossDomain = this._corsSupport();
    }

    /**
     * STATIC. Encode clientId and clientPassword for authorization
     *
     * @param {string} clientId
     * @param {string} clientPassword
     */
    static getAuthToken(clientId, clientPassword) {
        return `Basic ${Base64.encode(`${clientId}:${clientPassword}`)}`;
    }

    /**
     * Get Client Instance
     * */
    static getUtils() {
        return new this();
    }

    /**
     * PRIVATE. Networking stuff
     *
     * @param {object} settings { type, url, data }
     */
    _networking({ type, url, data }) {
        // Remember, this = CCValidator
        // Browser is not capable of making cross-origin Ajax calls
        if (!this.crossDomain) {
            return Promise.reject({
                "ResultCode": "009999",
                "ResultMessage": "Browser does not support making cross-origin Ajax calls"
            });
        }

        return this._callAJAX({ type, url, data });
    }

    /**
     * PRIVATE. Performs an asynchronous HTTP (Ajax) request
     *
     * @param {object} settings { type, crossDomain, url, data }
     */
    _callAJAX({ type, url, data, crossDomain = true }) {

        return new Promise(function(fulfill, reject) {

            // XMLHttpRequest object
            let xmlhttp = new XMLHttpRequest();

            // Put together input data as string
            let parameters = "";
            for (let key in data) {
                parameters += (parameters.length > 0 ? '&' : '') + key + "=" + encodeURIComponent(data[key]);
            }

            // URL to hit, with parameters added for GET request
            if (type === "get") {
                url = url + (url.indexOf("?") > -1 ? '&' : '?') + parameters;
            }

            function _on_exception(req, exc) {
                let code, msg;
                if (crossDomain) {
                    code = "001598";
                    msg = "A cross-origin HTTP request failed";
                } else {
                    code = "001597";
                    msg = "An HTTP request failed";
                }
                if (exc && exc.message.length) {
                    msg = msg + ': ' + exc.message;
                }
                reject(req, { ResultCode: code, ResultMessage: msg, xmlhttp: req });
            }

            // Cross-domain requests in IE 7, 8 and 9 using XDomainRequest
            if (crossDomain && !("withCredentials" in xmlhttp) && window.XDomainRequest) {
                xdr = new XDomainRequest();
                xdr.onreject = function() {
                    reject(xdr);
                };
                xdr.onload = function() {
                    fulfill(xdr.responseText, xdr);
                };
                try {
                    xdr.open(type, url);
                    xdr.send(type === "post" ? parameters : null);
                } catch (e) {
                    return _on_exception(xdr, e);
                }
                return;
            }

            // Attach fulfill and reject handlers
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4) {
                    if (/^2[0-9][0-9]$/.test(xmlhttp.status)) {
                        fulfill(xmlhttp.responseText, xmlhttp);
                    } else {
                        reject(xmlhttp);
                    }
                }
            };

            // Open connection
            try {
                xmlhttp.open(type, url, true);
            } catch (e) {
                return _on_exception(xmlhttp, e);
            }

            // Send extra header for POST request
            if (type === "post") {
                xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            } else {
                xmlhttp.setRequestHeader("authorization", "Basic aWduaXZhNDQ6bm42dk1VMTFhcnQxS29MZ3dGR2hRQnhEbUU5bUswR2VmTHl4Z3NvMWVjNjM5UkNxSFY=");
            }

            // Send data
            try {
                xmlhttp.send(type === "post" ? parameters : null);
            } catch (e) {
                return _on_exception(xmlhttp, e);
            }

        });

    }

    /**
     * PRIVATE. Returns true if browser is capable of making cross-origin Ajax calls
     */
    _corsSupport() {

        // Test if runtime is React Native
        if (window.navigator.product === 'ReactNative') {
            return true;
        }

        // IE 10 and above, Firefox, Chrome, Opera etc.
        if ("withCredentials" in new XMLHttpRequest()) {
            return true;
        }

        // IE 8 and IE 9
        if (window.XDomainRequest) {
            return true;
        }

        return false;

    }

}