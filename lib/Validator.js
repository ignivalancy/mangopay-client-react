/**
 * MangoPay Client Credit Card Validator Class
 */

export default class Validator {

    /**
     * PRIVATE. Validates card data. Returns true if card data is valid or a message string otherwise
     * @param {object} cardData Sensitive card details {cardNumber, cardType, cardExpirationDate, cardCvx}
     */
    validateCardData({ cardNumber = '', cardType = '', cardExpirationDate = '', cardCvx = '' }) {

        // Validate card number
        let isCardValid = this.cardNumberValidator(cardNumber);
        if (isCardValid !== true) return isCardValid;

        // Validate expiration date
        let isDateValid = this.expirationDateValidator(cardExpirationDate, new Date());
        if (isDateValid !== true) return isDateValid;

        // Validate card CVx based on card type
        let isCvvValid = this.cvvValidator(cardCvx, cardType);
        if (isCvvValid !== true) return isCvvValid;

        // The data looks good
        return true;
    }

    /**
     * PRIVATE. Validates CVV code
     * @param {string} cvv Card CVx to check
     * @param {string} cardType Type of card to check (AMEX or CBVISAMASTERCARD)
     */
    cvvValidator(cvv, cardType) {

        if (cardType === "MAESTRO" || cardType === "BCMC") {
            return true;
        }
        cvv = cvv.trim();
        cardType = cardType.trim();

        // CVV is 3 to 4 digits for AMEX cards and 3 digits for all other cards
        if (this.validateNumericOnly(cvv) === true) {
            if (cardType === "AMEX" && (cvv.length === 3 || cvv.length === 4)) {
                return true;
            }
            if (cardType === "CBVISAMASTERCARD" && cvv.length === 3) {
                return true;
            }
        }

        // Invalid format
        return {
            "ResultCode": "105204",
            "ResultMessage": "CVVFORMATERROR"
        };

    }

    /**
     * PRIVATE. Validates date code in mmyy format
     * @param {string} cardDate Card expiration date to check
     */
    expirationDateValidator(cardDate, currentDate) {

        cardDate = cardDate.trim();

        // Requires 2 digit for month and 2 digits for year
        if (cardDate.length === 4) {

            let year = parseInt(cardDate.substr(2, 2), 10) + 2000;
            let month = parseInt(cardDate.substr(0, 2), 10);

            if (month > 0 && month <= 12) {

                let currentYear = currentDate.getFullYear();
                if (currentYear < year)
                    return true;

                if (currentYear === year) {
                    let currentMonth = currentDate.getMonth() + 1;
                    if (currentMonth <= month)
                        return true;
                }

                // Date is in the past
                return {
                    "ResultCode": "105203",
                    "ResultMessage": "PASTEXPIRYDATEERROR"
                };

            }
        }

        // Date does not look correct
        return {
            "ResultCode": "105203",
            "ResultMessage": "EXPIRYDATEFORMATERROR"
        };
    }

    /**
     * PRIVATE. Validates card number
     * @param {string} cardNumber Card number to check
     */
    cardNumberValidator(cardNumber) {

        cardNumber = cardNumber.trim();

        // Check for numbers only
        if (this.validateNumericOnly(cardNumber) === false) {
            return {
                "ResultCode": "105202",
                "ResultMessage": "CARDNUMBERFORMATERROR"
            };
        }

        // Compute and validate check digit
        if (this.validateCheckDigit(cardNumber) === false) {
            return {
                "ResultCode": "105202",
                "ResultMessage": "CARDNUMBERFORMATERROR"
            };
        }

        // Number seems ok
        return true;
    }

    /**
     * PRIVATE. Validates card number check digit
     * @param {string} cardNumber Card number to check
     */
    validateCheckDigit(cardNumber) {

        // From https://stackoverflow.com/questions/12310837/implementation-of-luhn-algorithm
        let nCheck = 0;
        let nDigit = 0;
        let bEven = false;

        let value = cardNumber.replace(/\D/g, "");

        for (let n = value.length - 1; n >= 0; n--) {
            let cDigit = value.charAt(n),
                nDigit = parseInt(cDigit, 10);
            if (bEven) {
                if ((nDigit *= 2) > 9) nDigit -= 9;
            }
            nCheck += nDigit;
            bEven = !bEven;
        }

        return (nCheck % 10) === 0;
    }

    /**
     * PRIVATE. Validates if given string contain only numbers
     * @param {string} input numeric string to check
     */
    validateNumericOnly(cardNumber) {

        let numbers = /^[0-9]+$/;

        if (cardNumber.match(numbers)) {
            return true;
        }

        return false;
    }

}