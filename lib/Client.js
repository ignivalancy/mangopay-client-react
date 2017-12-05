/**
 * MangoPay Client Main Class
 */

import Networking from './Networking';
import Validator from './Validator';

export default class Client {

    constructor(clientId, clientPassword, userId, baseURL, version) {
        this.baseURL = `${baseURL}/${version}/${clientId}`;
        this._networking = new Networking(clientId, clientPassword, userId);
        this._validator = new Validator();
    }

    static mangoPayClient;

    /**
     * Get Client Instance
     * @param {string} clientId mango pay client id
     * @param {string} clientPassword mango pay client password
     * @param {string} userId mango pay user's id
     * @param {string} baseURL mango pay api baseURL
     * @param {string} version mango pay api version
     * */
    static getInstance(clientId = '', clientPassword = '', userId = '', baseURL = 'https://api.sandbox.mangopay.com', version = 'v2.01') {

        if (!this.mangoPayClient)
            this.mangoPayClient = new this(clientId, clientPassword, userId, baseURL, version);

        return this.mangoPayClient;
    }

    /**
     * Get my card list
     */
    async getCards() {

        try {

            let { Result, xmlhttp } = await this._networking.callHTTP({
                type: 'get',
                url: `${this.baseURL}/users/${this._networking._userId}/cards`,
                auth: true
            });

            return JSON.parse(Result);

        } catch (err) {

            if (err.Result) return JSON.parse(err.Result);

            if (err.ResultCode) {
                return {
                    "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                    "ResultCode": err.ResultCode,
                    "ResultMessage": err.ResultMessage
                };
            }

            return {
                "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                "ResultMessage": "getting cards list error"
            };

        }

    }

    /**
     * Card registration process
     * @param {object} sensitive card details {currencyCode, cardNumber, cardType, cardExpirationDate, cardCvx}
     */
    async cardRegisterationProcesses({ currencyCode, cardNumber, cardType, cardExpirationDate, cardCvx }) {

        let result = await this.getCardRegisterationData({ currencyCode });
        return await this.registerCard(result, { cardNumber, cardType, cardExpirationDate, cardCvx });

    }

    /**
     * Get card register data prepared on the server
     * @param {object} card register details {tag, currencyCode, cardType}
     */
    async getCardRegisterationData({ tag = 'mangopay-client-react', currencyCode, cardType }) {

        try {

            let { Result, xmlhttp } = await this._networking.callHTTP({
                type: 'post',
                url: `${this.baseURL}/cardregistrations`,
                data: {
                    Tag: tag,
                    UserId: this._networking._userId,
                    Currency: currencyCode,
                    CardType: cardType
                },
                auth: true
            });

            return JSON.parse(Result);

        } catch (err) {

            if (err.Result) return JSON.parse(err.Result);

            if (err.ResultCode) {
                return {
                    "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                    "ResultCode": err.ResultCode,
                    "ResultMessage": err.ResultMessage
                };
            }

            return {
                "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                "ResultMessage": "Card registeration error"
            };

        }

    }

    /**
     * Card registration
     * @param {object} card pre-registration data {Id, cardRegistrationURL, preregistrationData, accessKey}
     * @param {object} sensitive card details {cardNumber, cardType, cardExpirationDate, cardCvx}
     */
    async registerCard(cardRegisterData, cardData) {

        // Validate card data
        let isCardValid = this._validator.validateCardData(cardData);

        if (isCardValid !== true) {
            return isCardValid;
        };

        // Try to register card in two steps: get Payline token and then finish card registration with MangoPay API
        return await this._tokenizeCard({ ...cardRegisterData, ...cardData });

    }

    /**
     * PRIVATE. Gets Payline token for the card
     * @param {object} data Sensitive card details {Id, cardRegistrationURL, preregistrationData, accessKey, cardNumber, cardExpirationDate, cardCvx, cardType}
     */
    async _tokenizeCard(data) {

        try {

            let { Result, xmlhttp } = await this._networking.callHTTP({
                // Payline expects POST
                type: "post",
                // Payline service URL
                url: data.CardRegistrationURL,
                // Sensitive card data plus pre-registration data and access key
                data: {
                    data: data.PreregistrationData,
                    accessKeyRef: data.AccessKey,
                    cardNumber: data.cardNumber,
                    cardExpirationDate: data.cardExpirationDate,
                    cardCvx: data.cardCvx
                }
            });

            // Something wrong, no data came back from Payline
            if (Result !== null && Result.indexOf("errorCode=") === 0) {
                return {
                    "xmlhttp": xmlhttp,
                    "ResultCode": Result.replace("errorCode=", ""),
                    "ResultMessage": "Token processing error"
                };
            } else if (Result === null) {
                return {
                    "xmlhttp": xmlhttp,
                    "ResultCode": "001599",
                    "ResultMessage": "Token processing error"
                };
            }

            // Complete card regisration with MangoPay API
            return await this._finishRegistration({ Id: data.Id, RegistrationData: Result });


        } catch (err) {

            if (err.Result) return err.Result;

            if (err.xmlhttp && err.xmlhttp.status == "0") { //in a browser its shown as 499, however the client computer blocks the call even before it's able to do the Payline request (most likely due to an antivirus)
                return {
                    "xmlhttp": err.xmlhttp,
                    "ResultCode": "001596",
                    "ResultMessage": "An HTTP request was blocked by the User's computer (probably due to an antivirus)"
                };
            }

            return {
                "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                "ResultCode": "001599",
                "ResultMessage": "Token processing error"
            };

        }

    }

    /**
     * PRIVATE. Finishes card registration using the encrypted Payline token data
     * @param {object} paylineData Object {Id, RegistrationData} with card registration resource id and payline token data
     */
    async _finishRegistration(paylineData) {

        try {

            // Use MangoPay API call to complete card regisration
            let { Result, xmlhttp } = await this._networking.callHTTP({
                type: "post",
                // URL to MangoPay API CardRegistration resource
                url: `${this.baseURL}/cardregistrations/${paylineData.Id}`,
                // Payline card registration data along CardRegistration resource id
                data: paylineData,
                auth: true
            });

            // Parse API reponse
            try {
                Result = JSON.parse(Result);
            } catch (err) {
                return {
                    "xmlhttp": xmlhttp,
                    "ResultCode": "101699",
                    "ResultMessage": "CardRegistration should return a valid JSON response"
                };
            }

            return Result;

        } catch (err) {

            if (err.Result) return JSON.parse(err.Result);

            if (err.ResultCode) {
                return {
                    "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                    "ResultCode": err.ResultCode,
                    "ResultMessage": err.ResultMessage
                };
            }

            let message = "CardRegistration error";

            if (err.xmlhttp && err.xmlhttp.response) { // Try to get API error message
                try {
                    let responseParsed = JSON.parse(err.xmlhttp.response);
                    if (responseParsed.Message) {
                        message = responseParsed.Message;
                    }
                } catch (err) {}
            }

            return {
                "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                "ResultCode": "101699",
                "ResultMessage": message
            };

        }

    }

    /**
     * Deactivate Card
     * @param {String} cardId which you want to deactivate
     */
    async deactivateCard(cardId) {

        try {

            let { Result, xmlhttp } = await this._networking.callHTTP({
                type: 'put',
                url: `${this.baseURL}/cards/${cardId}`,
                auth: true
            });

            return JSON.parse(Result);

        } catch (err) {

            if (err.Result) return JSON.parse(err.Result);

            if (err.ResultCode) {
                return {
                    "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                    "ResultCode": err.ResultCode,
                    "ResultMessage": err.ResultMessage
                };
            }

            return {
                "xmlhttp": err.xmlhttp ? err.xmlhttp : null,
                "ResultMessage": "getting cards error"
            };

        }

    }

}