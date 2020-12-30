var express = require('express');
var router = express.Router();
const { check } = require('express-validator/check');
const { Users, Premium, Purchases } = require("../database/dashboard/db");
const { Roles, Servers, Votes, Premiums } = require("../database/reactionroles/db");
const moment = require("moment");
const axios = require('axios')
var paypal = require('paypal-rest-sdk');
const url = require('url');
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': '',
  'client_secret': ''
});

router.route('/processonce').get(function (req, res, next) {
  //Retrieve payment token appended as a parameter to the redirect_url specified in
  //billing plan was created. It could also be saved in the user session
  let paymentToken = req.query.token
  let sid = req.signedCookies.sID
  if (paymentToken) {
    console.log(paymentToken)
    if (sid) {

    }

  }
})

router.route('/completed').get(function (req, res, next) {
  res.render('thankspurchase')

})

router.route('/once').post(function (req, res, next) {

  let sid = req.signedCookies.sID;

  if (sid) {
    var create_payment_json = {
      "intent": "sale",
      "payer": {
        "payment_method": "paypal"
      },
      "redirect_urls": {
        "return_url": "https://reactionroles.com/premium/processonce",
        "cancel_url": "https://reactionroles.com/premium/"
      },
      "transactions": [{
        "item_list": {
          "items": [{
            "name": "Reaction Roles Monthly Premium",
            "sku": "001",
            "price": "5.00",
            "currency": "USD",
            "quantity": 1
          }]
        },
        "amount": {
          "currency": "USD",
          "total": "5.00"
        },
        "description": "Monthly plan for premium on reaction roles discord bot.."
      }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        for (var index = 0; index < payment.links.length; index++) {
          //Redirect user to this endpoint for redirect url
          if (payment.links[index].rel === 'approval_url') {
            res.redirect(payment.links[index].href);
          }
        }
        console.log(payment);
      }
    });

  } else {
    res.redirect('/auth/')
  }


})


module.exports = router;
