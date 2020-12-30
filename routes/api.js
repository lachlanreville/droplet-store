const express = require('express');
const router = express.Router();
const { check } = require('express-validator/check');
let apiController = require('../controllers/apiController')

router.route('/checkCoupon').post([], apiController.checkCoupon)


router.use((req, res, next) => {
    if (req.token == '') {
        return next();
    } else {
        return res.json({ error: "I no work when u no give me gud code to authenticatea twith" });
    }
});

router.route('/checkKey/:bot/:key/:guildid/:userid').post([
    check('bot').isString(),
    check('key').isString(),
    check('guildid').isString(),
    check('userid').isString()
], apiController.checkKey)



router.route('/genKey/').post([
    check('bot').isString(),
    check('length').isString(),
    check('amount').isString()
], apiController.genKey)

router.route('/reactionroles/poststatus/:shardid/:status/:guilds/:channels/:members/:ping/:premium').post(apiController.sendRRStatus)

router.route('/reactionroles/status').get(apiController.getRRStatus)


module.exports = router;
