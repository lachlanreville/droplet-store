var express = require('express');
var router = express.Router();
const { check } = require('express-validator/check');
const { Users, Premium, Products, Bots } = require("../database/dashboard/db");
const axios = require('axios')
const premiumHandler = require('../controllers/premiumController')
const apiController = require('../controllers/apiController')


router.route('/processonce').get(premiumHandler.processOnce)
router.route('/thanks/').get(function (req, res, next) {
  res.render('thankspurchase')
})
/* GET home page. */
router.route('/').get(function (req, res, next) {
  let sid = req.signedCookies.sID
  console.log("User has a Session Id", sid)
  if (!sid) return res.redirect('/auth/')
  Bots.findAll().then(async result => {
    let botArray = [];
    await result.forEach(async result => {
      result = result.dataValues;
      await botArray.push(result)
    })
    res.render('index', { data: botArray })
  })

});

router.route('/:bot/').get(async function (req, res, next) {
  let sid = req.signedCookies.sID

  if (!sid) return res.redirect('/auth/')

  let bot = req.params.bot.toLowerCase()
  Products.findAll({ where: { bots: bot } }).then(async result => {
    let botArray = [];
    await result.forEach(async result => {
      result = result.dataValues;
      await botArray.push(result)
    })
    Users.findOne({ where: { sessionid: sid } }).then(results => {
      if (results) {
        let guildArr = [];
        axios.get("http://discordapp.com/api/users/@me/guilds",
          { 'headers': { 'Authorization': `Bearer ${results.token}` } },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }).then(data => {
            data.data.forEach(d => {
              if (d.permissions == 2147483647) {
                guildArr.push(d)
              }
            });
            res.render('purchase', { bots: botArray, guilds: guildArr })
          }).catch(e => {
          });
      } else {
        res.redirect('/auth/')
      }
    });
  });
}).post(premiumHandler.makeUrl);

module.exports = router;
