console.log('Loading function');

const https = require('https');
const url = require('url');
const request = require('request');
const parseString = require('xml2js').parseString;
const moment = require('moment-timezone');

const slackUrl = 'https://hooks.slack.com/xxxx';
const slackParam = {
  "channel": "#ichi-log", 
  "username": "SeiyuBot", 
  "iconEmoji": ":name_badge:"
}

const testRss = [ 
  'http://himanji.tumblr.com/rss',
  'http://pocapontas.tumblr.com/rss'
  ]
const rssList = [
  'http://himanji.tumblr.com/rss',
  'http://pocapontas.tumblr.com/rss',
  'http://maeda-toshiie.tumblr.com/rss',
  'http://ktminamotokr.tumblr.com/rss',
]


exports.handler = function(event, context) {
    //console.log(event);
    var post_slack = function (req_url, message) {
      return new Promise(function(resolve, reject) {
          var option = url.parse(req_url);
          option.method = 'POST';
          option.headers = {'Content-Type': 'application/json'};
          req = https.request(option, function (res) {
            if (res.statusCode === 200) {
              console.log('success: ' + req_url);
              resolve(true);
            } else {
              console.log('error: ' + req_url);
              reject('status code: ' + res.statusCode);
            }
          });

          req.on('error', function(e) {
              console.log('problem with request: ' + e.message);
              reject(e.message);
          });
          var send_json = {
            "channel": slackParam.channel,
            "username": slackParam.username,
            "icon_emoji": slackParam.iconEmoji,
            "text": message
          }
          req.write(JSON.stringify(send_json));
          req.end();
      });
  }

  // tumblerからデータ拾うのにRSSを使う（APIは申請がめんどいので）
  var getRSS = function(url){
    return new Promise(function(resolve, reject) {
      //オプションを定義
      var options = {
        url: url,
        method: 'GET',
        json: true,
      };

      //リクエスト送信
      request(options, function (error, response, body) {
        parseString(body, function (err, result) {
            var item = result.rss.channel[0].item
            link = []
            for(var i=0; i < item.length; i++){
              //link.push(item[i].link[0])
              var txt = item[i].description[0]
              var jpg_hit = txt.match(/http.[^"]*\.jpg/g);//スクレイピングより普通に正規表現使うのが早いという...
              var gif_hit = txt.match(/http.[^"]*\.gif/g)
              link = link.concat(jpg_hit);
              link = link.concat(gif_hit);
            }
            link.some(function(val, i){
              if (val === null) link.splice(i , 1);
            });
            //console.log(link);
            resolve(link);
        });
      });
    });
  }

  //日時で実行可否判断 / 平日10 - 19時のみ
  var date = moment.tz("Asia/Tokyo");
  var hour = parseInt(date.format("H"));
  var day_of_week = parseInt(date.format("d"));
  console.log(hour, day_of_week);
  if( day_of_week == 0 || day_of_week == 6){
    context.succeed('exit: holiday');
  }
  if(hour < 10 || hour > 19){
    context.succeed('exit: not business hours');
  }

  //画像URLの取得処理
  var linkList = []
  var tasks = [];
  for(var i=0; i < rssList.length; i++){
    tasks.push( getRSS(rssList[i]) );
  }

  Promise.all(tasks).then(function(results) {
    linkList = []
    for(var i=0; i < results.length; i++){
      linkList = linkList.concat(results[i])
    }
    linkList = linkList.filter(function (element, index, self) {
            return self.indexOf(element) === index;
        });
    console.log(linkList.length);
    max = linkList.length
    rand = Math.floor( Math.random() * max );
    link = linkList[rand]
    //console.log(linkList)
    console.log(linkList.length, link);
    return post_slack(slackUrl, link);
  }).then(function(result){
    context.succeed('done');
    //console.log('done');
  });

  console.log('last');
};