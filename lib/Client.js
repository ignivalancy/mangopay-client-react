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
     * @param {string} mango pay client id
     * @param {string} mango pay client password
     * @param {string} mango pay user's id
     * @param {string} mango pay api baseURL
     * @param {string} mango pay api version
     * */
    static getInstance(clientId = '', clientPassword = '', userId = '', baseURL = 'https://api.sandbox.mangopay.com', version = 'v2.01') {

        if (!this.mangoPayClient)
            this.mangoPayClient = new this(clientId, clientPassword, userId, baseURL, version);

        return this.mangoPayClient;
    }

    /**
     * PRIVATE. Get my card array
     */
    async getCards() {

        try {

            let { Result, xmlhttp } = await this._networking.callHTTP({
                type: 'get',
                url: `${this.baseURL}$/users/${this._networking._userId}/cards`,
                auth: true
            });

            return JSON.parse(Result);

        } catch (err) {

            if (err.Result) return err.Result;

            return {
                "xmlhttp": err.xmlhttp ? err.xmlhttp : err,
                "ResultMessage": "getting cards error"
            };

        }

    }

    /**
     * PRIVATE. Processes card registration
     * @param {object} cardData Sensitive card details {tag, currencyCode, cardNumber, cardType, cardExpirationDate, cardCvx}
     */
    async cardRegisterationProcesses({ currencyCode, cardNumber, cardType, cardExpirationDate, cardCvx }) {

        let result = await this.getCardRegisterationData({ currencyCode });
        return await this.registerCard(result, { cardNumber, cardType, cardExpirationDate, cardCvx });

    }

    /**
     * Get card pre-registration data
     * @param {object} cardData Sensitive card details {tag, currencyCode, cardType}
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

            if (err.Result) return err.Result;

            return {
                "xmlhttp": err.xmlhttp ? err.xmlhttp : err,
                "ResultMessage": "Card registeration error"
            };

        }

    }

    /**
     * PRIVATE. Processes card registration
     * @param {object} cardRegisterData Card pre-registration data {Id, cardRegistrationURL, preregistrationData, accessKey}
     * @param {object} cardData Sensitive card details {cardNumber, cardType, cardExpirationDate, cardCvx}
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
                "xmlhttp": err.xmlhttp ? err.xmlhttp : err,
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
                url: `${this.baseURL}$/cardregistrations/${paylineData.Id}`,
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

            if (err.Result) return err.Result;

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
                "xmlhttp": err.xmlhttp ? err.xmlhttp : err,
                "ResultCode": "101699",
                "ResultMessage": message
            };

        }

    }

}