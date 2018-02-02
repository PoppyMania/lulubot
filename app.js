require('dotenv').config();
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const champion_data = require("./champion_data.json");
const lol_patch =  process.env.CURRENT_PATCH || "8.1.1";

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const region = "jp1";
const fs = require('fs');

var http = require('http'); //httpモジュール呼び出し
var server = http.createServer();
server.on('request', doRequest);

function doRequest(req, res) {
  if (req.url == "/riot.txt") {
    fs.readFile('./riot.txt', 'utf-8' , function (err, data) {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.write(data);
      res.end();
    });
  } else {
    fs.readFile('./index.html', 'utf-8' , doReard );
    function doReard(err, data) {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      res.end();
    }
  }
}

server.listen(process.env.PORT || 8080);

client.on("ready", () => {
  console.info(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
  console.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  console.info(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});


var is_talking_channel_flags = {};

client.on("message", async message => {
  if(message.author.bot) return;
  if(message.content.indexOf(config.prefix) !== 0) return;
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === 'luluchan') {
    console.log('/luluchan');

    if (message.member.voiceChannel) {
      var channel = message.member.voiceChannel;
      var channel_id = channel.id;

      if(is_talking_channel_flags[channel_id]) { return; }
      is_talking_channel_flags[channel_id] = true;

      message.member.voiceChannel.join()
        .then(connection => {
          const random_id = Math.floor(Math.random() * 10)+1;
          const random_voice_path = './audio/' + random_id + '.mp3';
          const dispatcher = connection.playFile(random_voice_path);
          dispatcher.setVolume(0.3);
          message.delete().catch(O_o=>{});

          dispatcher.on('end', () => {
            console.log('ひゃはははは');
            channel.leave();
            is_talking_channel_flags[channel_id] = false;
          });
        })
        .catch(O_o => {
          is_talking_channel_flags[channel_id] = false;
        });

    } else {
      message.delete().catch(O_o=>{});
      var messages = [
        "おあいできて光栄ですわ！",
        "チューリップのめをみちゃだめよ。",
        "どこかで会ったかしら？",
        "はわわ・・・めがまわる・・・",
        "あ、ちょうちょ！",
        "だいへんしーん！",
        "あわわわわ！",
        "ひらめいた！"
      ];
      message.channel.send(messages[ Math.floor( Math.random() * messages.length ) ]);
    }
  }

  if(command === "lulu") {
    const summonerName = args.join(" ");
    if (summonerName) {
      console.log('/lulu ' + summonerName);
      checkSummonerStatus(summonerName, message);
    } else {
      console.log('/lulu');
      message.channel.send("るるちゃんは見ているよ！");

      var body =
        "① `/lulu a0k0` のようにサモナーネームを添えてチャットしてね。\n" +
        "② サモナーの情報と、現在の試合内容が確認できるよ！\n" +
        "③ その他の使い方は `/luluhelp` で確認してね。\n\n" +
        "うまく動かないときにはAPIのステータス( https://developer.riotgames.com/api-status/ )を確認するか、" +
        "作者( https://twitter.com/a0k0 )に連絡してね！";

      var embed = {
        "color": 13015781,
        "author": {
          "name": "つかいかた👾",
          "url": "http://luluchan.herokuapp.com/",
        },
        "description": body
      };

      //post
      sendToDiscord(embed, message);
    }
  }

  if(command === "lulusay") {
    console.log('/lulusay');
    const sayMessage = args.join(" ");
    message.delete().catch(O_o=>{});
    message.channel.send(sayMessage);
  }

  if(command === "luluhelp") {
    console.log('/luluhelp');

    var body =
      "**/lulu サモナー名** : " +
      "サモナーの情報と、現在の試合内容が確認できるよ\n" +
      "**/luluchan** : " +
      "るるちゃんがしゃべるよ\n" +
      "**/luluhelp** : " +
      "これだよ\n\n" +
      "導入方法等は http://luluchan.herokuapp.com/ を確認してみてね！";

    var embed = {
      "color": 13015781,
      "description": body
    };

    //post
    sendToDiscord(embed, message);
  }
});


client.login(DISCORD_TOKEN);






//現在のゲーム情報をDiscordに投稿する
function postCurrentGameData(data, name, summoner_data, message) {
  var game_id = data.gameId;
  var mode = data.gameMode;
  var length = Math.ceil(data.gameLength / 60);
  var participants = data.participants;

  var team_a_string = '';
  var team_b_string = '';
  var body = '';

  var complete_count = 0;
  var max_complete_count = participants.length;


  //サモナーごとに名前を取得(10人)
  for(var i in participants) {
    var p = participants[i];
    createPersonalData(p, function(personalData) {

      var p_name = personalData.p_name;
      var p_champion = personalData.p_champion;
      var p_team = personalData.p_team;
      var p_id = personalData.p_id;
      var p_rate_data = personalData.p_rate_data;
      var p_rate = personalData.p_rate;

      if (p_team == "100") { team_a_string += p_champion + " (" + p_name + " / " + p_rate + ")　\n"; }
      else { team_b_string += p_champion + " (" + p_name + " / " + p_rate + ")　\n"; }

      complete_count++;
      if(complete_count === max_complete_count) {
        after_complete(summoner_data, name, mode, length, team_a_string, team_b_string, message);
      }
    });
  }
}


//サモナーの情報をDiscordに投稿する
function postSummonerData(summoner_data, message) {
  var id = summoner_data.id;

  accessGetSummonerRate(id, function(summoner_rate) {
    var name = summoner_data.name;
    var level =  summoner_data.summonerLevel;
    var icon_id = summoner_data.profileIconId;
    var opgg_url = "https://jp.op.gg/summoner/userName=" + name.replace( / /g , "+" );

    var rate_data = {};
    var rate = "";

    for(var i in summoner_rate) {
      if (summoner_rate[i].queueType === "RANKED_SOLO_5x5") {
        rate_data = summoner_rate[i];
        break;
      }
    }

    if (rate_data.tier) {
      var tier = rate_data.tier;
      var rank = rate_data.rank;
      rate = tier + " " + rank;
    }
    else { rate = "NoRank" }

    var embed = {
      "color": 13015781,
      "url": opgg_url,
      "thumbnail": {
        "url": "http://ddragon.leagueoflegends.com/cdn/" + lol_patch + "/img/profileicon/" + icon_id + ".png",
        "width": 80,
        "height": 80
      },
      "description": "**" + name + "** (" + level + "lv)\n" + rate + "\n\n" + opgg_url
    };

    //post
    sendToDiscord(embed, message);
    console.log('サモナー情報をかいた！');
  });
}


function createPersonalData(participant, onCreate) {
  var p_name = participant.summonerName;
  var p_name_encoded = encodeURIComponent(participant.summonerName);
  var p_champion = getChampionName(participant.championId);
  var p_team = participant.teamId;
  accessGetSummonerInfo(p_name_encoded, function(summoner_data) {
    var p_id = summoner_data.id;
    accessGetSummonerRate(p_id, function(summoner_rate) {
      var p_rate_data = {};
      var p_rate = "";

      for(var i in summoner_rate) {
        if (summoner_rate[i].queueType === "RANKED_SOLO_5x5") {
          p_rate_data = summoner_rate[i];
          break;
        }
      }

      if (p_rate_data.tier) {
        var p_tier = p_rate_data.tier;
        var p_rank = p_rate_data.rank;

        switch(p_tier) {
          case "BRONZE": p_tier = "B"; break;
          case "SILVER": p_tier = "S"; break;
          case "GOLD": p_tier = "G"; break;
          case "PLATINUM": p_tier = "P"; break;
          case "DIAMOND": p_tier = "D"; break;
          case "MASTER": p_tier = "M"; break;
          case "CHALLENGER": p_tier = "C"; break;
          default: break;
        }

        switch(p_rank) {
          case "V": p_rank = "5"; break;
          case "IV": p_rank = "4"; break;
          case "III": p_rank = "3"; break;
          case "II": p_rank = "2"; break;
          case "I": p_rank = "1"; break;
          default: break;
        }
        p_rate = p_tier + p_rank;
      }
      else { p_rate = "--" }

      var createData = {
        "p_name": p_name,
        "p_champion": p_champion,
        "p_team": p_team,
        "p_id": p_id,
        "p_rate_data": p_rate_data,
        "p_rate": p_rate
      }

      onCreate(createData);
    });
  });
}


function after_complete(summoner_data, name, mode, length, team_a_string, team_b_string, message) {
  //本文を作成
  var icon_id = summoner_data.profileIconId;
  var opgg_url = "https://jp.op.gg/summoner/userName=" + name.replace( / /g , "+" );

  var embed = {
    "color": 13015781,
    "footer": {
      "text": length + "分前に開始",
    },
    "author": {
      "name": summoner_data.name + "さんはゲーム中です🎮　(" + mode + ")",
      "url": opgg_url,
      "icon_url": "http://ddragon.leagueoflegends.com/cdn/" + lol_patch + "/img/profileicon/" + icon_id + ".png"
    },
    "fields": [
      {
        "name": "Blue side",
        "value": team_a_string,
        "inline": true
      },{
        "name": "Red side",
        "value": team_b_string,
        "inline": true
      },
    ]
  };

  //post
  sendToDiscord(embed, message);
  console.log('ゲーム情報をかいた！');
}


//Discordに投稿する
function sendToDiscord(embed, message) {
  message.channel.send({ "embed": embed })
  .catch(console.error);
}



//Championの情報を公式からコピー（1日1回）
//毎回API叩こうとしたら制限にひっかかった…
//データをしまうとこがないのでうごいてないよ
function saveStaticApi() {
  var url = "static-data/v3/champions";
  var api = "https://";
  api += region;
  api += ".api.riotgames.com/lol/";
  api += url;
  api += "?locale=ja_JP";
  api += "&api_key=" + RIOT_API_KEY;

  var option = {
    'method' : 'get',
    'contentType' : 'application/json; charset=utf-8'
  };
  //var response = UrlFetchApp.fetch(api, {'muteHttpExceptions': true});
  var json = response.getContentText();
  var data_value = data_range.setValue(json);
}


function checkSummonerStatus(name, message) {
  accessGetSummonerInfo(encodeURIComponent(name), function(summoner_data) {
    var summoner_id = summoner_data.id;
    accessGetSummonerCurrentGame(summoner_id, function(currentGame_data) {
      var status = currentGame_data.status;
      if (status) {
        if (status.status_code == "404"){
          message.channel.send(name + "さんは、いまゲームしてないみたい！");
          postSummonerData(summoner_data, message);
          console.log('ゲームしてない！');
        } else if (status.status_code == "400"){
          message.channel.send(name + "さんは、さもなーじゃないみたい！");
          console.log('さもなーじゃない！');
        }　else if (status.status_code == "429"){
          message.channel.send("えーぴーあいの制限にひっかかっちゃった・・・");
          console.warn('えーぴーあい制限！');
        }　else if (status.status_code == "403"){
          message.channel.send("るるちゃんにはけんげんがないみたい！");
          console.warn('けんげんがないの！');
        } else {
          message.channel.send(status.status_code + "ばんのえらーみたい！");
          console.error('えらーだよ！' + status.status_code + ':' + status.message);
        }
      }
      else {
        postSummonerData(summoner_data, message);
        postCurrentGameData(currentGame_data, encodeURIComponent(name), summoner_data, message);
      }
    });
  });
}


//inGame?
function accessGetSummonerCurrentGame(summonerId, onSuccess) {
  var url = "spectator/v3/active-games/by-summoner/" + summonerId;
  accessLolApi(url, onSuccess);
}

//Summoner名から情報を割り出す
function accessGetSummonerInfo(name, onSuccess) {
  var url = "summoner/v3/summoners/by-name/" + name;
  accessLolApi(url, onSuccess);
}

//SummonerIDからレートを割り出す
function accessGetSummonerRate(summonerId, onSuccess) {
  var url = "league/v3/positions/by-summoner/" + summonerId;
  accessLolApi(url, onSuccess);
}

//ChampionIDからChampの名前を割り出す
function getChampionName(champion_id) {
  var data = Object.keys(champion_data.data).map(function (key) {return champion_data.data[key]});
  var champion = data.filter(function(item, index){return (item.id == champion_id);});
  if (champion) { var name = champion[0].name; }
  else { var name = "だあれ？"; }
  return name;
}

function accessLolApi(url, onSuccess) {
  var api = "https://";
  api += region;
  api += ".api.riotgames.com/lol/";
  api += url;
  api += "?locale=ja_JP";
  api += "&api_key=" + RIOT_API_KEY;

  var request = require('request');
  request.get({
    "url": api,
    "json": true
  }, function (error, response, body) {
    if(onSuccess) {
      onSuccess(body);
    }
  });
}
