import CCValidator from './CCValidator';
import Util from './Util';

const mangoPayClient = null;

export default class MangoPay {

    constructor(baseURL, clientId, clientPassword) {
        this.baseURL = baseURL;
        this.clientId = clientId;
        this.clientPassword = clientPassword;
        this.authorization = Util.getAuthToken(clientId, clientPassword);
        this.utils = Util.getUtils();
    }

    /**
     * Get Client Instance
     * */
    static getInstance(clientId = '', clientPassword = '', baseURL = 'https://api.sandbox.mangopay.com') {
        if (!mangoPayClient)
            mangoPayClient = new this(baseURL, clientId, clientPassword);

        return mangoPayClient;

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
        let isCardValid = CCValidator.validateCardData(cardData);
        if (isCardValid !== true) {
            return Promise.reject(isCardValid);
        };

        // Try to register card in two steps: get Payline token and then finish card registration with MangoPay API
        return await this._tokenizeCard(cardData, this._finishRegistration);

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
                RegistrationData: data
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

    async getCards(cardData) {

        // console.dir(this.utils)

        return await this.utils._networking({
            type: "get",
            url: 'https://api.sandbox.mangopay.com/v2/igniva44/users/38080065/cards'
        });

    }

}