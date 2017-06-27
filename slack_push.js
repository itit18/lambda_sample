//Slackへの通知ボット / API GW経由で使われるイメージ
//nodev 4.3

console.log('Loading function');

const https = require('https');
const url = require('url');

const slackUrl = 'https://hooks.slack.com/xxxx';
const slackParam = {
  "channel": "#xxx", 
  "username": "BotName", 
  "iconEmoji": ":sun_with_face:"
}

exports.handler = function(event, context) {
    console.log(event);// eventに含まれている値を使って送信メッセージを作成します
    var postSlack = function (requestrUrl, message) {
      return new Promise(function(resolve, reject) {
          var option = url.parse(requestrUrl);
          option.method = 'POST';
          option.headers = {'Content-Type': 'application/json'};
          req = https.request(option, function (res) {
            if (res.statusCode === 200) {
              console.log('success: ' + requestrUrl);
              resolve(true);
            } else {
              console.log('error: ' + requestrUrl);
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
          /*
          メモ: 
          もっといい感じのメッセージを送りたい場合はtextプロパティの代わりにattachmentsプロパティを使う
          "attachments": [
            {
              "fallback": "ブログに記事が投稿されました。（http://xxx）",
              "color": "#36a64f",
              "pretext": "ブログに記事が投稿されました。",
              "author_name": "xyz_i",
              "author_link": "http://xxx/",
              "title": "Slack WebAPIでナイスなフォーマットのメッセージを送る",
              "title_link": "http://xxx",
              "text": "（ブログの冒頭や本文を全部入れても良いかもしれません。）"
            }
          ],
          */
      });
  }

  if (event.channel !== undefined){
    slackParam.channel = event.channel;
  }
  message = event.subject + "\n>>>" + event.message;

  var tasks = [
    postSlack(slackUrl, message)
  ];
  Promise.all(tasks).then(function(results) {
    context.succeed('done');
  }).catch(function(error){
    context.fail(error)
  });

  console.log('last');
};