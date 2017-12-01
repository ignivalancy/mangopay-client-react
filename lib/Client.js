/**
 * MangoPay Client Main Class
 */

import Networking from './Networking';
import Validator from './Validator';

export default class Client {

    constructor(clientId, clientPassword, userId, baseURL) {
        this.baseURL = baseURL;
        this._networking = new Networking(clientId, clientPassword, userId);
        this._validator = new Validator();
    }

    static mangoPayClient;

    /**
     * Get Client Instance
     * @param {string} mango pay client id
     * @param {string} mango pay client password
     * @param {string} mango pay user's id
     * @param {string} mango pay api's baseURL
     * */
    static getInstance(clientId = '', clientPassword = '', userId = '', baseURL = 'https://api.sandbox.mangopay.com') {
        if (!this.mangoPayClient)
            this.mangoPayClient = new this(clientId, clientPassword, userId, baseURL);

        return this.mangoPayClient;

    }

    /**
     * Get card pre registration data
     * @param {object} cardData Sensitive card details {tag, currencyCode, cardType}
     */
    async getCardRegisterationData({ tag = 'mangopay-client-react', currencyCode, cardType }) {

        return await this._networking.callHTTP({
            type: 'post',
            url: `${this.baseURL}/v2.01/${this._networking._clientId}/cardregistrations`,
            data: {
                Tag: tag,
                UserId: this._networking._userId,
                Currency: currencyCode,
                CardType: cardType
            },
            auth: true
        });

    }

    /**
     * Initialize card registration object
     * @param {object} cardRegisterData Card pre-registration data {Id, cardRegistrationURL, preregistrationData, accessKey}
     */
    init(cardRegisterData) {

        this._cardRegisterData = cardRegisterData;

    }

    /**
     * Processes card registration and calls success or error callback
     * @param {object} cardData Sensitive card details {cardNumber, cardType, cardExpirationDate, cardCvx}
     */
    async registerCard(cardData) {

        // Validate card data
        let isCardValid = this._validator.validateCardData(cardData);
        console.log('isCardValid', isCardValid)
        if (isCardValid !== true) {
            return isCardValid;
        };

        // Try to register card in two steps: get Payline token and then finish card registration with MangoPay API
        return await this._tokenizeCard(cardData);

    }

    /**
     * PRIVATE. Gets Payline token for the card
     *
     * @param {object} cardData Sensitive card details {cardNumber, cardExpirationDate, cardCvx, cardType}
     * @param {function} resultCallback A function to invoke when getting the token succeeds
     * @param {function} successCallback A function to invoke when card registration succeeds
     * @param {function} errorCallback A function to invoke when card registration fails
     */
    async _tokenizeCard(cardData, resultCallback) {

        try {

            let getServerRes = await Util.networking({
                // Payline expects POST
                type: "post",
                // Payline service URL obtained from the mangoPay.cardRegistration.init() call
                url: this._cardRegisterData.cardRegistrationURL,
                // Sensitive card data plus pre-registration data and access key received from the mangoPay.cardRegistration.init() call
                data: {
                    data: this._cardRegisterData.preregistrationData,
                    accessKeyRef: this._cardRegisterData.accessKey,
                    cardNumber: cardData.cardNumber,
                    cardExpirationDate: cardData.cardExpirationDate,
                    cardCvx: cardData.cardCvx
                }
            });

            // Something wrong, no data came back from Payline
            if (getServerRes !== null && getServerRes.indexOf("errorCode=") === 0) {
                return Promise.reject({
                    "xmlhttp": xmlhttp,
                    "ResultCode": data.replace("errorCode=", ""),
                    "ResultMessage": "Token processing error"
                });
            } else if (getServerRes === null) {
                return Promise.reject({
                    "xmlhttp": xmlhttp,
                    "ResultCode": "001599",
                    "ResultMessage": "Token processing error"
                });
            }

            // Prepare data to send in the second step
            let dataToSend = {
                Id: mangoPay.cardRegistration._cardRegisterData.Id,
                RegistrationData: getServerRes.data
            };

            // Complete card regisration with MangoPay API
            return await Util.networking(dataToSend);


        } catch (err) {


            if (err) return Promise.reject(err);

            if (xmlhttp.status == "0") { //in a browser its shown as 499, however the client computer blocks the call even before it's able to do the Payline request (most likely due to an antivirus)
                return Promise.reject({
                    "xmlhttp": xmlhttp,
                    "ResultCode": "001596",
                    "ResultMessage": "An HTTP request was blocked by the User's computer (probably due to an antivirus)"
                });
            }

            return Promise.reject({
                "xmlhttp": xmlhttp,
                "ResultCode": "001599",
                "ResultMessage": "Token processing error"
            });
        }

    }


    /**
     * PRIVATE. Finishes card registration using the encrypted Payline token data
     *
     * @param {object} paylineData Object {Id, RegistrationData} with card registration resource id and payline token data
     * @param {function} successCallback A function to invoke when the card registration call succeeds
     * @param {function} errorCallback A function to invoke when the card registration call fails
     */
    _finishRegistration(paylineData, successCallback, errorCallback) {

        // Use MangoPay API call to complete card regisration
        // return await Util.networking({

        //     // This call exceptionally uses POST for browser compatibility (for IE 8 and 9)
        //     type: "post",

        //     // URL to MangoPay API CardRegistration resource
        //     url: mangoPay.cardRegistration.baseURL + '/v2.01/' + mangoPay.cardRegistration.clientId + '/CardRegistrations/' + paylineData.Id,

        //     // Payline card registration data along CardRegistration resource id
        //     data: paylineData,

        //     // Invoke the user supplied success or error handler here
        //     success: function(data, xmlhttp) {

        //         // Parse API reponse
        //         try {
        //             data = JSON.parse(data);
        //         } catch (err) {
        //             errorCallback({
        //                 "xmlhttp": xmlhttp,
        //                 "ResultCode": "101699",
        //                 "ResultMessage": "CardRegistration should return a valid JSON response"
        //             });
        //             return;
        //         }

        //         // Invoke user supplied success or error callbacks
        //         if (data.ResultCode === "000000") {
        //             successCallback(data);
        //         } else {
        //             errorCallback(data);
        //         }

        //     },

        //     // Forward error to user supplied callback
        //     error: function(xmlhttp, result) {

        //         if (result) return errorCallback(result);

        //         let message = "CardRegistration error";

        //         // Try to get API error message
        //         if (xmlhttp.response) {
        //             try {
        //                 let responseParsed = JSON.parse(xmlhttp.response);
        //                 if (responseParsed.Message) {
        //                     message = responseParsed.Message;
        //                 }
        //             } catch (err) {}
        //         }

        //         // Invoke user supplied error callback
        //         errorCallback({
        //             "xmlhttp": xmlhttp,
        //             "ResultCode": "101699",
        //             "ResultMessage": message
        //         });

        //     }

        // });

    }

    /**
     * Get my card array
     */
    async getCards() {

        return await this._networking.callHTTP({
            type: 'get',
            url: `${this.baseURL}/v2.01/${this._networking._clientId}/users/${this._networking._userId}/cards`,
            auth: true
        });

    }

}