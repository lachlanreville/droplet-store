const createError = require("http-errors");
const axios = require("axios");
const { validationResult } = require("express-validator/check");
const {
  Users,
  Premium,
  Products,
  Bots,
  Coupon,
} = require("../database/dashboard/db");
const rr = require("../database/reaction_roles/db");
const ss = require("../database/suggestion_sensation/db");

const premiumController = require("./premiumController");

const randomString = require("randomstring");
const moment = require("moment");
let rrStatus = [];

exports.useCoupon = async function (coupon) {
  let copon = await Coupon.findOne({ where: { code: coupon } });
  if (!copon || copon == null) return;
  copon.update({ timesused: Math.floor(copon.dataValues.timesused) + 1 });
};

exports.makeKey = async function (code, payid, guildid, clientid, email) {
  if (!code) return false;
  if (!payid) return false;
  if (!guildid) return false;

  let payCheck = await Premium.findOne({
    where: { paymentId: payid },
    raw: true,
  });
  if (payCheck) return false;

  let invoiceid = Math.floor(Math.random() * 10000000) + `-${guildid}`;
  let product = await Products.findOne({ where: { code: code }, raw: true });
  let length = product.name;

  if (product.name == "Lifetime") length = "100 Years";

  let date = moment().format("YYYY-MM-DD");
  let things = length.split(" ");
  let expire = moment(date).add(things[0], things[1]).format("YYYY-MM-DD");

  if (product.bots == "reactionroles") {
    let serverInfo = await rr.rrServers.findOne({
      where: { guildid: guildid },
      raw: true,
    });
    if (!serverInfo || serverInfo == null) {
      rr.rrServers.create({ guildid: guildid, premium: true });
    } else {
      rr.rrServers.update({ premium: true }, { where: { guildid: guildid } });
    }
    let rrPremium = await rr.rrPremium.findOne({ where: { guildid: guildid } });
    if (!rrPremium || rrPremium == null) {
      rr.rrPremium.create({
        code: "Not Needed",
        redeemed: true,
        expires: expire,
        length: length,
        guildid: guildid,
        clientid: clientid,
      });
    } else {
      expire = moment(rrPremium.dataValues.expires)
        .add(things[0], things[1])
        .format("YYYY-MM-DD");
      let currentLength = rrPremium.dataValues.length;
      let idfkanymore = currentLength.split(" ");
      let currentmonth = parseInt(idfkanymore[0]);
      let newMonth = currentmonth + parseInt(things[0]);
      let newdatestringythingy = `${newMonth} Months`;
      if (newMonth >= 12)
        newdatestringythingy = `${Math.floor(newMonth / 12)} Years`;
      if (currentmonth == 100 && idfkanymore[1] == "Years") {
      } else {
        rrPremium.update({ expires: expire, length: newdatestringythingy });
      }
    }
  }
  if (product.bots == "suggestionsensation") {
    let serverInfo = await ss.ssServers.findOne({
      where: { guildid: guildid },
      raw: true,
    });
    if (!serverInfo || serverInfo == null) {
      ss.ssServers.create({ guildid: guildid, premium: true });
    } else {
      ss.ssServers.update({ premium: true }, { where: { guildid: guildid } });
    }
    let ssPremium = await ss.ssPremium.findOne({ where: { guildid: guildid } });
    if (!ssPremium || ssPremium == null) {
      ss.ssPremium.create({
        code: "Not Needed",
        redeemed: true,
        expires: expire,
        length: length,
        guildid: guildid,
        clientid: clientid,
      });
    } else {
      expire = moment(ssPremium.dataValues.expires)
        .add(things[0], things[1])
        .format("YYYY-MM-DD");
      let currentLength = ssPremium.dataValues.length;
      let idfkanymore = currentLength.split(" ");
      let currentmonth = parseInt(idfkanymore[0]);
      let newMonth = currentmonth + parseInt(things[0]);
      let newdatestringythingy = `${newMonth} Months`;
      if (newMonth >= 12)
        newdatestringythingy = `${Math.floor(newMonth / 12)} Years`;
      if (currentmonth == 100 && idfkanymore[1] == "Years") {
      } else {
        ssPremium.update({ expires: expire, length: newdatestringythingy });
      }
    }
  }

  Premium.create({
    bot: product.bots,
    key: "Not Needed",
    length: length,
    email: email,
    paymentId: payid,
    invoiceId: invoiceid,
    redeemed: true,
    guildid: guildid,
    clientid: clientid,
    expires: expire,
  });
  let returns = {
    guild: guildid,
    invoiceid: invoiceid,
  };
  return returns;
};

exports.checkKey = async function (req, res) {
  let data = req.params;
  if (!data.key) return res.json({ success: false });
  let key = await Premium.findOne({
    where: { key: data.key, bot: data.bot, redeemed: false },
    raw: true,
  });
  if (!key || key == null) return res.json({ success: false });
  else {
    let date = moment().format("YYYY-MM-DD");
    let things = key.length.split(" ");
    let expire = moment(date).add(things[0], things[1]).format("YYYY-MM-DD");
    Premium.update(
      {
        redeemed: true,
        guildid: data.guildid,
        clientid: data.userid,
        expires: expire,
      },
      { where: { key: data.key, bot: data.bot } }
    );
    return res.json({ success: true, expires: expire, length: key.length });
  }
};

exports.genKey = async function (req, res) {
  let data = req.body;
  if (!data || data == null)
    return res.json({ error: "Please send me valid information" });

  let length = data.length;
  if (!length || length == null)
    return res.json({ error: "Please send me valid information" });
  let keyArr = [];
  let amount = parseInt(data.amount);
  if (!amount || amount == null)
    return res.json({ error: "Please send me valid information" });
  if (!data.bot || data.bot == null)
    return res.json({ error: "Please send me valid information" });
  let i = 0;
  while (i < amount) {
    i += 1;
    let key = randomString.generate(20);
    await keyArr.push(key);
    Premium.create({
      bot: data.bot,
      key: key,
      length: length,
      paymentId: "Generated",
      invoiceId: "Generated",
    });
  }

  return res.json({ success: true, key: keyArr });
};

exports.sendRRStatus = async function (req, res) {
  rrStatus = rrStatus.filter((item) => item.shardid !== req.params.shardid);
  rrStatus.push(req.params);
  return res.json(rrStatus);
};

exports.getRRStatus = async function (req, res) {
  return res.json(rrStatus);
};

exports.checkCoupon = async function (req, res) {
  let data = req.body.data;
  let newData = {};
  data.forEach((c) => {
    newData[c.name] = c.value;
  });
  if (newData.coupon != "") {
    Coupon.findOne({ where: { code: newData.coupon } }).then(async (result) => {
      if (result) {
        if (result.dataValues.timesused < result.dataValues.maxuse) {
          if (
            req.headers.referer.split("/")[3] == result.dataValues.bot ||
            result.dataValues.bot == "all"
          ) {
            let off = result.dataValues.percentage;

            return res.json({
              success: true,
              price: off,
              coupon: newData.coupon,
            });
          } else {
            return res.json({ success: false });
          }
        } else {
          return res.json({ success: false });
        }
      } else {
        return res.json({ success: false });
      }
    });
  }
};
