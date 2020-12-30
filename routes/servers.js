var express = require('express');
var router = express.Router();
var axios = require('axios')
const querystring = require('query-string');
const { Roles, Servers, Votes, Premium } = require("../database/reactionroles/db");
const { Users } = require("../database/dashboard/db");


let client_id = ""
let client_secret = ""

router.get(`/:guildid`, async function (req, res) {

    let sid = req.signedCookies.sID;

    let guildid = req.params.guildid;

    Users.findOne({ where: { sessionid: sid } }).then(data => {
        if (data) {
            data = data.dataValues

            Servers.findOne({ where: { guildid: guildid } }).then(results => {
                if (results) {
                    axios.get("http://discordapp.com/api/users/@me/guilds",
                        { 'headers': { 'Authorization': `Bearer ${data.token}` } },
                        {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        }).then(data => {
                            data.data.forEach(d => {
                                if (d.permissions == 2146959359) {
                                    if (d.id == guildid) {
                                        axios.post(`/api/server/${guildid}/getRR`,
                                            {},
                                            {
                                                headers: {
                                                    'Content-Type': 'application/x-www-form-urlencoded',
                                                    'Authorization': `Bearer ${sid}`
                                                }
                                            }).then(response => {
                                                console.log(response.data)
                                            })

                                    }
                                }
                            })
                        }).catch(err => {

                            axios.post("https://discordapp.com/api/oauth2/token",
                                querystring.stringify({
                                    "grant_type": "refresh_token",
                                    "refresh_token": data.refresh,
                                    "scope": "identify email guilds",
                                    "client_id": client_id,
                                    "client_secret": client_secret,
                                    "redirect_uri": "https://reactionroles.com/servers/"
                                }), {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                }
                            }).then(res2 => {
                                let token = res2.data.access_token
                                let refresh = res2.data.refresh_token
                                Users.findOne({ where: { sessionid: sid } }).then(data => {
                                    if (data) {
                                        data.update({ refresh: refresh, token: token })
                                    }
                                })

                                res.cookie('sID', sid, { maxAge: 84600000, signed: true, save: true, sameSite: false, httpOnly: true, domain: '.reactionroles.com' })

                                res.redirect(`/servers/${guildid}`)
                            }).catch(err => {
                                res.redirect("/auth")

                            });
                        })
                } else {
                    return res.redirect(`https://discordapp.com/oauth2/authorize?client_id=550613223733329920&permissions=1342532688&scope=bot&guild_id=${guildid}`)
                }

            })
        } else {
            res.redirect("/auth/")
        }
    })

})


module.exports = router;
