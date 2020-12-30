const express = require('express');
const router = express.Router();
const { check } = require('express-validator/check');
const path = require('path')
const axios = require('axios')
const querystring = require('querystring')
const manager = require('../database/manager/db')
const { Users, Premium, Products, Bots, Coupon } = require("../database/dashboard/db");


let apiController = require('../controllers/apiController')
const fs = require('fs')

let client_id = ""
let client_secret = ""

router.route('/login').get(function (req, res, next) {
    res.render('login')
});
router.route('/process').get(function (req, res, next) {
    let code = req.query.code;
    axios.post("https://discordapp.com/api/oauth2/token",
        querystring.stringify({
            "grant_type": "authorization_code",
            "code": code,
            "scope": "identify email",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": "https://store.droplet.gg/admin/process"
        }), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(async res2 => {
        axios.get("http://discordapp.com/api/users/@me",
            { 'headers': { 'Authorization': `Bearer ${res2.data.access_token}` } },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(async data => {
                userid = data.data
                userid.access = res2.data.access_token
                // Change to ranks
                let staff = await manager.Staff.findOne({ where: { userid: userid.id } });
                let position = await staff.dataValues.position;
                position = parseInt(position)
                if (position >= 4) {
                    req.session.loggedin = true
                    req.session.user = userid
                    res.redirect('/admin/')
                } else {
                    res.redirect('/auth/')
                }
            }).catch(err => console.error(err))
    }).catch(err => console.error(err))
});

router.use(function (req, res, next) {
    if (req.session.loggedin && req.session.user) {
        console.log(req.session)
        next()
    } else {
        res.redirect('/admin/login')
    }
})

router.route('/').get(function (req, res, next) {
    manager.Staff.findAll().then(c => {
        res.render('dashboard', { data: c })

    })
});

router.route('/management/').get(function (req, res, next) {
    let newArr = [];

    manager.Staff.findAll().then(c => {
        i = 0
        c.forEach(d => {
            d = d.dataValues;

            newArr[i] = {}

            newArr[i].id = d.userid
            newArr[i].tickets = d.amounthandled
            newArr[i].strikes = d.strikes
            newArr[i].username = d.username
            switch (d.position) {
                case 0:
                    newArr[i].position = "Trainee";
                    break;
                case 1:
                    newArr[i].position = "Support Team";
                    break;
                case 2:
                    newArr[i].position = "Moderator";
                    break;
                case 3:
                    newArr[i].position = "Administrator";
                    break;
                case 4:
                    newArr[i].position = "Management";
                    break;
                case 5:
                    newArr[i].position = "Owner";
                    break;
                default:
                    newArr[i].position = "Error";
                    break;
            }
            i += 1

        })
        res.render('management', { data: newArr })

    })
});

router.route('/coupons/').get(async function (req, res, next) {
    let data = await Coupon.findAll()
    let newArr = [];
    for (let i = 0; i < data.length; i++) {
        c = data[i].dataValues;

        newArr[i] = {}

        newArr[i].coupon = c.code;
        newArr[i].percentage = c.percentage;
        newArr[i].maxuse = c.maxuse;
        newArr[i].timesused = c.timesused;
        switch (c.bot) {
            case "reactionroles":
                newArr[i].bot = "Reaction Roles"
                break;
            case "authme":
                newArr[i].bot = "AuthMe"
                break;
            case "suggestionsensation":
                newArr[i].bot = "Suggestion Sensation"
                break;
            case "all":
                newArr[i].bot = "All"
                break;
            default:
                newArr[i].bot = "Error"
                break;
        }
    }
    res.render('coupon', { data: newArr })
})

router.route('/coupons/createCoupon').get(async function (req, res, next) {
    res.render('createcoupon')
}).post(async function (req, res, next) {
    console.log(req.body)
    let data = req.body;

    if (isNaN(data.percentage)) {
        return res.redirect("/admin/coupons/createCoupon");
    }
    if (isNaN(data.max)) {
        return res.redirect("/admin/coupons/createCoupon");
    }
    if (data.coupon.includes(" ")) {
        return res.redirect("/admin/coupons/createCoupon");
    }
    if (data.percentage > 99 || data.percentage < 1) {
        return res.redirect("/admin/coupons/createCoupon");
    }
    let coupon = await Coupon.findOne({ where: { code: data.coupon } })
    if (!coupon || coupon == null) {
        await Coupon.create({ code: data.coupon, timesused: "0", bot: data.bot, percentage: data.percentage, maxuse: data.max })
    } else {
        await coupon.update({ bot: data.bot, percentage: data.percentage, maxuse: data.max })

    }
    res.redirect('/admin/coupons')
})

router.route('/coupons/delete/:coupon').get(async function (req, res, next) {
    if (!req.params) {
        next()
    } else {
        await Coupon.destroy({ where: { code: req.params.coupon } })
        res.redirect("/admin/coupons/")
    }

});

router.route('/coupons/edit/:coupon').get(async function (req, res, next) {
    if (!req.params) {
        next()
    } else {
        let coupon = await Coupon.findOne({ where: { code: req.params.coupon } })
        res.render('updatecoupon', { data: coupon.dataValues })
    }

})

router.route('/showPurchase/:purchase').get(function (req, res, next) {
    if (!req.params.purchase) return;

    var tempFile = `/../pdfs/` + `${req.params.purchase}.pdf`;
    res.sendFile(path.join(__dirname + tempFile));
});

module.exports = router;
