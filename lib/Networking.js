/**
 * MangoPay Client Networking Class
 */

import Base64 from 'base-64';

export default class Networking {

    constructor(clientId, clientPassword, userId) {
        this._clientId = clientId;
        // this.clientPassword = clientPassword;
        this._authorization = this.getAuthToken(clientId, clientPassword);
        this._userId = userId;
        this._crossDomain = this.corsSupport();
    }

    /**
     * PRIVATE. Encode clientId and clientPassword for mangopay authorization
     * @param {string} clientId
     * @param {string} clientPassword
     */
    getAuthToken(clientId, clientPassword) {
        return `Basic ${Base64.encode(`${clientId}:${clientPassword}`)}`;
    }

    /**
     * PRIVATE. Performs an asynchronous HTTP request
     * @param {object} - { type, url, data }
     */
    callHTTP({ type, url, data = {}, auth = false }) {

        return new Promise((fulfill, reject) => {

            // Client is not capable of making cross-origin HTTP calls
            if (!this._crossDomain) {
                reject({
                    "ResultCode": "009999",
                    "ResultMessage": "Client does not support making cross-origin Ajax calls"
                });
            }

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

            let _on_exception = (req, exc) => {
                let code, msg;
                if (this._crossDomain) {
                    code = "001598";
                    msg = "A cross-origin HTTP request failed";
                } else {
                    code = "001597";
                    msg = "An HTTP request failed";
                }
                if (exc && exc.message.length) {
                    msg = msg + ': ' + exc.message;
                }
                reject({ ResultCode: code, ResultMessage: msg });
            }

            // Cross-domain requests in IE 7, 8 and 9 using XDomainRequest
            if (this._crossDomain && !("withCredentials" in xmlhttp) && window.XDomainRequest && !auth) {
                xdr = new XDomainRequest();
                xdr.onreject = () => {
                    reject(JSON.parse(xdr.responseText));
                };
                xdr.onload = () => {
                    fulfill(JSON.parse(xdr.responseText));
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
            xmlhttp.onreadystatechange = () => {
                if (xmlhttp.readyState == 4) {
                    if (/^2[0-9][0-9]$/.test(xmlhttp.status)) {
                        fulfill(JSON.parse(xmlhttp.responseText));
                    } else {
                        reject(JSON.parse(xmlhttp.responseText));
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
                xmlhttp.setRequestHeader("Content-type", "application/json");
            }
            if (auth) {
                xmlhttp.setRequestHeader("authorization", this._authorization);
                parameters = JSON.stringify(data);
            }

            // Send data
            try {
                xmlhttp.send(type === "post" ? JSON.stringify(data) : null);
            } catch (e) {
                return _on_exception(xmlhttp, e);
            }

        });

    }

    /**
     * PRIVATE. Returns true if browser is capable of making cross-origin Ajax calls
     */
    corsSupport() {

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