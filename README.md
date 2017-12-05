# MANGOPAY JS Client Library
================================================
Mangopay React and React Native First JS Client library with card registration workflow.


Installation
-------------------------------------------------
Install the module via npm

	npm i mangopay-client-react -S

Usage inside your app

	import Mangopay from "mangopay-client-react";
	*** Get Client Instance
	const MangoPayClient = Mangopay.getInstance();

	async getCards() {
      try {
          let result = await MangoPayClient.getCards();
          console.log('getCards', result);
      } catch (err) {
          console.log(err)
      }
  }


Documentation
-------------------------------------------------
Refer to [MANGOPAY REST API documentation](http://docs.mangopay.com/api-references/) and 
[MANGOPAY card registration process](http://docs.mangopay.com/api-references/card-registration/) for more information.


Usage
-------------------------------------------------
Make sure you have the right configuration in a place:

    *** Get MANGOPAY Client Singelton Object
    // @clientId {string} API Client Id
    // @clientPassword {string} API Client Password
    // @userId {string} User ID
    // @baseUrl {string} API Base URL. The fault base value points to sandbox. Production is 'https://api.mangopay.com'
    const MangoPayClient = Mangopay.getInstance(clientId, clientPassword, userId, baseUrl);

Card List:

    *** Get my card list
    const getCards = await MangoPayClient.getCards();
    console.log(getCards);

Card Registration:

    *** Get card register data prepared on the server
    // @cardRegData {object} card register details {currencyCode, cardType}
    const preRegData = await MangoPayClient.getCardRegisterationData(cardRegData);

    *** Card registration
    // @preRegData {object} card pre-registration data {Id, cardRegistrationURL, preregistrationData, accessKey}
    // @cardData {object} sensitive card details {cardNumber, cardType, cardExpirationDate, cardCvx}
    const result = await MangoPayClient.registerCard(preRegData, cardData);
    console.log(result);

Card Deactivation: 

    *** Deactivate Card
    // @cardId {String} card id which you want to deactivate
    let result = await MangoPayClient.deactivateCard(cardId);
    console.log(result);

Card Registration Process (Bonus):

    *** Card registration process
    // @cardData {object} sensitive card details {currencyCode, cardNumber, cardType, cardExpirationDate, cardCvx}
    let result = await MangoPayClient.cardRegisterationProcesses(cardData);
    console.log(result);


License
-------------------------------------------------
MANGOPAY Client Library is distributed under MIT license.


Contacts
-------------------------------------------------
Report bugs or suggest features using issue tracker at GitHub.