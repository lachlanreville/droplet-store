const express = require("express");
const router = express.Router();
const axios = require("axios");
const querystring = require("query-string");
const { Users } = require("../database/dashboard/db");
const randomString = require("randomstring");

let client_id = "";
let client_secret = "";

/* GET home page. */
router.route("/").get(function (req, res, next) {
  let sid = req.signedCookies.sID;
  if (sid) {
    return res.redirect(
      "https://discordapp.com/api/oauth2/authorize?client_id=555054749460856843&redirect_uri=https%3A%2F%2Fstore.droplet.gg%2Fauth%2Fcode&response_type=code&scope=guilds%20email%20identify&prompt=none"
    );
  } else {
    return res.redirect(
      "https://discordapp.com/api/oauth2/authorize?client_id=555054749460856843&redirect_uri=https%3A%2F%2Fstore.droplet.gg%2Fauth%2Fcode&response_type=code&scope=guilds%20email%20identify"
    );
  }
});

router.get("/code", async (req, res) => {
  let code = req.query.code;
  console.log(code);
  axios
    .post(
      "https://discordapp.com/api/oauth2/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code: code,
        scope: "identify email guilds",
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: "https://store.droplet.gg/auth/code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    .then((res2) => {
      res.redirect(
        `https://store.droplet.gg/auth/cookiefactory?token=${res2.data.access_token}&refresh=${res2.data.refresh_token}`
      );
    })
    .catch((err) => {
      res.redirect("/auth/");
    });
});

router.get("/cookiefactory", async (req, res, next) => {
  let code = req.query;
  let sid = req.signedCookies.sID;

  let random = randomString.generate(24);

  Users.findOne({ where: { token: code.token } }).then((data) => {
    if (data) {
      res.cookie("sID", data.dataValues.sessionid, {
        maxAge: 604800000,
        signed: true,
        save: true,
        sameSite: false,
        httpOnly: true,
        domain: ".droplet.gg",
      });
      data.update({ refresh: code.refresh, token: code.token });
      res.redirect("/");
    } else {
      res.cookie("sID", random, {
        maxAge: 604800000,
        signed: true,
        save: true,
        sameSite: false,
        httpOnly: true,
        domain: ".droplet.gg",
      });
      Users.create({
        sessionid: random,
        refresh: code.refresh,
        token: code.token,
      });
      res.redirect("/");
    }
  });
});

module.exports = router;
