const axios = require("axios");
const {
  Users,
  Premium,
  Products,
  Bots,
  Coupon,
} = require("../database/dashboard/db");
const apiController = require("./apiController");
var paypal = require("paypal-rest-sdk");
const path = require("path");
const url = require("url");
const nodemailer = require("nodemailer");
const moment = require("moment");
var pdf = require("pdf-creator-node");
var fs = require("fs");

var html = fs.readFileSync(
  path.join(__dirname, "../views/invoice.html"),
  "utf8"
);

paypal.configure({
  mode: "live", //sandbox or live
  client_id:
    "AcmA5__Fv5ohz4M_jCpQpwQrmL26I2Iz0pi53jv-DjrgYrzloqWu2puZE2fsK1njU7zpbDfk35wKZYQM",
  client_secret:
    "ECzDMnpetKgitQraF86s2FQZl3kows8hJcKxfwgvssnXO2jUEOcwUrsSYVEBq5qy319bgTadMHNcfGMi",
});

exports.makeUrl = async function (req, res) {
  let sid = req.signedCookies.sID;
  if (sid) {
    let info = req.body;
    if (!info.guild) return res.redirect("/auth/");
    let result = await Products.findOne({
      where: { code: info.price },
      raw: true,
    });
    let botName;
    if (result.bots == "reactionroles") {
      botName = "Reaction Roles";
    }
    if (result.bots == "suggestionsensation") {
      botName = "Suggestion Sensation";
    }
    if (!info.appliedCoupon) {
      var create_payment_json = {
        intent: "sale",
        payer: {
          payment_method: "paypal",
        },
        redirect_urls: {
          return_url:
            "https://store.droplet.gg/processonce?guild=" + info.guild,
          cancel_url: "https://store.droplet.gg/",
        },
        transactions: [
          {
            item_list: {
              items: [
                {
                  name: `${botName} ${result.name}`,
                  sku: info.price,
                  price: result.price,
                  currency: "USD",
                  quantity: 1,
                  category: "DIGITAL"
                },
              ],
            },
            amount: {
              currency: "USD",
              total: result.price,
            },
            description: "Droplet Development Premium Purchase",
          },
        ],
      };

      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          console.log(error.response.details);
        } else {
          for (var index = 0; index < payment.links.length; index++) {
            //Redirect user to this endpoint for redirect url
            if (payment.links[index].rel === "approval_url") {
              res.redirect(payment.links[index].href);
            }
          }
        }
      });
    } else {
      let coupon = await Coupon.findOne({
        where: { code: info.appliedCoupon.split(" ")[1] },
        raw: true,
      });
      var create_payment_json = {
        intent: "sale",
        payer: {
          payment_method: "paypal",
        },
        redirect_urls: {
          return_url:
            "https://store.droplet.gg/processonce?guild=" + info.guild,
          cancel_url: "https://store.droplet.gg/",
        },
        transactions: [
          {
            item_list: {
              items: [
                {
                  name: `${botName} ${result.name}`,
                  sku: info.price,
                  price: result.price,
                  currency: "USD",
                  quantity: 1,
                  category: "DIGITAL"
                },
                {
                  name: coupon.percentage + "% Off Coupon",
                  sku: coupon.code,
                  price:
                    "-" +
                    (
                      (parseFloat(result.price) / 100) *
                      parseFloat(coupon.percentage)
                    ).toFixed(2),
                  currency: "USD",
                  quantity: 1,
                  category: "DIGITAL"
                },
              ],
            },
            amount: {
              currency: "USD",
              total:
                parseFloat(result.price) -
                (
                  (parseFloat(result.price) / 100) *
                  parseFloat(coupon.percentage)
                ).toFixed(2),
            },
            description: "Droplet Development Premium Purchase",
          },
        ],
      };
      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          console.log(error.response.details);
        } else {
          for (var index = 0; index < payment.links.length; index++) {
            //Redirect user to this endpoint for redirect url
            if (payment.links[index].rel === "approval_url") {
              res.redirect(payment.links[index].href);
            }
          }
        }
      });
    }
  }
};

exports.processOnce = async function (req, res, next) {
  let paymentToken = req.query;
  let sid = req.signedCookies.sID;
  if (!sid) return;
  if (paymentToken) {
    paypal.payment.get(paymentToken.paymentId, async function (error, payment) {
      if (error) {
      } else {
        console.log(payment.transactions[0].amount);
        var execute_payment_json = {
          payer_id: payment.payer.payer_info.payer_id,
          transactions: [
            {
              amount: {
                currency: "USD",
                total: payment.transactions[0].amount.total,
              },
            },
          ],
        };
        let userid;

        Users.findOne({ where: { sessionid: sid } }).then((results) => {
          if (results) {
            axios
              .get(
                "http://discordapp.com/api/users/@me",
                { headers: { Authorization: `Bearer ${results.token}` } },
                {
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                }
              )
              .then((data) => {
                userid = data.data.id;

                let guildArr = [];
                axios
                  .get(
                    "http://discordapp.com/api/users/@me/guilds",
                    { headers: { Authorization: `Bearer ${results.token}` } },
                    {
                      headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                      },
                    }
                  )
                  .then(async (data) => {
                    await data.data.forEach((d) => {
                      if (d.id == paymentToken.guild) {
                        guildArr.push(d);
                      }
                    });
                    paypal.payment.execute(
                      paymentToken.paymentId,
                      execute_payment_json,
                      async function (error, payment) {
                        if (error) {
                          console.log(error);
                        } else {
                          if (payment.state == "approved") {
                            res.redirect("/thanks/");
                            if (
                              payment.transactions[0].item_list.items.length > 1
                            ) {
                              await apiController.useCoupon(
                                payment.transactions[0].item_list.items[1].sku
                              );
                            }

                            let data = await apiController.makeKey(
                              payment.transactions[0].item_list.items[0].sku,
                              paymentToken.paymentId,
                              paymentToken.guild,
                              userid,
                              payment.payer.payer_info.email
                            );
                            let invoiceid = data.invoiceid;

                            var options = {
                              format: "A4",
                              orientation: "portrait",
                              border: "10mm",
                              timeout: 1000000,
                            };
                            var document = {
                              html: html,
                              data: {
                                data: {
                                  invoiceid: invoiceid,
                                  date: moment().format("DD/MM/YYYY"),
                                  total: payment.transactions[0].amount.total,
                                },
                                items: payment.transactions[0].item_list.items,
                                guild: guildArr[0],
                                user: payment.payer.payer_info,
                              },
                              path: path.join(
                                __dirname,
                                `../pdfs/${invoiceid}.pdf`
                              ),
                            };
                            pdf
                              .create(document, options)
                              .then((c) => {
                                let transporter = nodemailer.createTransport({
                                  host: "smtp.zoho.com.au",
                                  port: 465,
                                  secure: true, // true for 465, false for other ports
                                  auth: {
                                    user: "payments@droplet.gg", // generated ethereal user
                                    pass: "54AiP6Y@&Iyo", // generated ethereal password
                                  },
                                });

                                // send mail with defined transport object
                                transporter.sendMail({
                                  from: '"Droplet Store" <payments@droplet.gg>', // sender address
                                  to: payment.payer.payer_info.email, // list of receivers
                                  bcc:
                                    "eriknilsen02@hotmail.com, lachlanreville4575@gmail.com ",
                                  subject: `Droplet Development Purchase #${invoiceid}`, // Subject line
                                  attachments: [
                                    {
                                      filename: "invoice.pdf",
                                      path: path.join(
                                        __dirname,
                                        `../pdfs/${invoiceid}.pdf`
                                      ),
                                    },
                                  ],
                                  html: ` <table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="m_-3661596876181345496m_353731505394291232bodyTable" style="border-collapse:collapse;height:100%;margin:0;padding:0;width:100%">
                                                                <tbody><tr>
                                                                    <td align="center" valign="top" id="m_-3661596876181345496m_353731505394291232bodyCell" style="height:100%;margin:0;padding:0;width:100%">
                                                                        
                                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                                                                            <tbody><tr>
                                                                                <td align="center" valign="top" id="m_-3661596876181345496m_353731505394291232templateHeader" style="background:#2a2727 none no-repeat center/cover;background-color:#2a2727;background-image:none;background-repeat:no-repeat;background-position:center;background-size:cover;border-top:0;border-bottom:0;padding-top:45px;padding-bottom:45px">
                                                                                    
                                                                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;max-width:600px!important">
                                                                                        <tbody><tr>
                                                                                            <td valign="top" style="background:transparent none no-repeat center/cover;background-color:transparent;background-image:none;background-repeat:no-repeat;background-position:center;background-size:cover;border-top:0;border-bottom:0;padding-top:0;padding-bottom:0"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse">
                                                            <tbody>
                                                                    <tr>
                                                                        <td valign="top" style="padding:9px">
                                                                            <table align="left" width="100%" border="0" cellpadding="0" cellspacing="0" style="min-width:100%;border-collapse:collapse">
                                                                                <tbody><tr>
                                                                                    <td valign="top" style="padding-right:9px;padding-left:9px;padding-top:0;padding-bottom:0;text-align:center">
                                                        
                                                                                            <a href="https://store.dropletdev.com" title="" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://store.dropletdev.com&amp;source=gmail&amp;ust=1578083153526000&amp;usg=AFQjCNE7M1_2A1MOzTlEnCNJA01O-hPJ0w">
                                                                                                <img align="center" alt="" src="https://ci3.googleusercontent.com/proxy/a5P6lQwiGoR14X9fTc5djWQFuFECoNm3H8ijRcdWloqTItX9gXHMyZblRczURfA6wDpEAqYGZs0NSrnFfWh-W9o9lueuMRHBeGt_2X3XtkHHDbY95hMPXUi3SpCgXiFubeCc9eJRUB2sUHDGHHdGACmD5vGnA0VWMPE=s0-d-e1-ft#https://gallery.mailchimp.com/5c747c683005fe8b612a3a5e1/images/e3357e43-b309-44b3-aad9-6a9e77253bb8.png" width="256" style="max-width:256px;padding-bottom:0px;vertical-align:bottom;display:inline!important;border:1px none #ffffff;height:auto;outline:none;text-decoration:none" class="CToWUd">
                                                                                            </a>
                                                        
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody></table>
                                                                        </td>
                                                                    </tr>
                                                            </tbody>
                                                        </table></td>
                                                                                        </tr>
                                                                                    </tbody></table>
                                                                                    
                                                                                </td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td align="center" valign="top" id="m_-3661596876181345496m_353731505394291232templateBody" style="background:#292626 none no-repeat center/cover;background-color:#292626;background-image:none;background-repeat:no-repeat;background-position:center;background-size:cover;border-top:0;border-bottom:0;padding-top:36px;padding-bottom:45px">
                                                                                    
                                                                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;max-width:600px!important">
                                                                                        <tbody><tr>
                                                                                            <td valign="top" style="background:transparent none no-repeat center/cover;background-color:transparent;background-image:none;background-repeat:no-repeat;background-position:center;background-size:cover;border-top:0;border-bottom:0;padding-top:0;padding-bottom:0"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse">
                                                            <tbody>
                                                                <tr>
                                                                    <td valign="top" style="padding-top:9px">
                                                                          
                                                                    
                                                                        
                                                                        <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:100%;min-width:100%;border-collapse:collapse" width="100%">
                                                                            <tbody><tr>
                                                        
                                                                                <td valign="top" style="padding:0px 18px 9px;font-size:14px;font-style:normal;font-weight:bold;text-align:left;word-break:break-word;color:#ffffff;font-family:Helvetica;line-height:150%">
                                                        
                                                                                    Thank you for purchasing ${payment.transactions[0].item_list.items[0].name}.<br>
                                                        <br>
                                                        Premium has been activated on the guild: <b>${guildArr[0].name} (${guildArr[0].id})</b> <br>
                                                        
                                                        Please find attached your receipt!
                                                                    <br>
                                                                                If you have any further enquiries or issues, please join our <a href="https://dropletdev.com/discord" style="color:#00add8;font-weight:normal;text-decoration:underline" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://dropletdev.com/discord&amp;source=gmail&amp;ust=1578083153526000&amp;usg=AFQjCNHQuF9kB-wLMftAKZDdl8hzLi3Mmw">support discord</a> and create a ticket!
                                                                                </td>
                                                                            </tr>
                                                                        </tbody></table>
                                                                        
                                                        
                                                                        
                                                                    </td >
                                                                </tr >
                                                            </tbody >
                                                        </table ></td >
                                                                                        </tr >
                                                                                    </tbody ></table >
                                                                                    
                                                                                </td >
                                                                            </tr >
                                                                <tr>
                                                                    <td align="center" valign="top" id="m_-3661596876181345496m_353731505394291232templateFooter" style="background:#292626 none no-repeat center/cover;background-color:#292626;background-image:none;background-repeat:no-repeat;background-position:center;background-size:cover;border-top:0;border-bottom:0;padding-top:45px;padding-bottom:63px">

                                                                        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;max-width:600px!important">
                                                                            <tbody><tr>
                                                                                <td valign="top" style="background:transparent none no-repeat center/cover;background-color:transparent;background-image:none;background-repeat:no-repeat;background-position:center;background-size:cover;border-top:0;border-bottom:0;padding-top:0;padding-bottom:0"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;border-collapse:collapse">
                                                                                    <tbody>
                                                                                        <tr>
                                                                                            <td valign="top" style="padding-top:9px">



                                                                                                <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:100%;min-width:100%;border-collapse:collapse" width="100%">
                                                                                                    <tbody><tr>

                                                                                                        <td valign="top" style="padding-top:0;padding-right:18px;padding-bottom:9px;padding-left:18px;word-break:break-word;color:#656565;font-family:Helvetica;font-size:12px;line-height:150%;text-align:center">

                                                                                                            <em>Copyright © <b>2020</b> <b>Droplet Development</b>, All rights reserved.</em><br>
                                                                                                                <br>
                                                                                                                    &nbsp;
                                                                                </td>
                                                                            </tr>
                                                                        </tbody></table>
                                                                        
                                                        
                                                                        
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table></td>
                                                                                        </tr>
                                                                                    </tbody></table>
                                                                                    
                                                                                </td>
                                                                            </tr>
                                                                        </tbody></table>
                                                                        
                                                                    </td >
                                                                </tr >
                                                            </tbody ></table > `,
                                });
                              })
                              .catch((error) => {
                                console.error(error);
                              });
                          }
                        }
                      }
                    );
                  });
              })
              .catch((e) => { });
          } else {
            res.redirect("/auth/");
          }
        });
      }
    });
  }
};

async function sendWebhook(premium) { }
