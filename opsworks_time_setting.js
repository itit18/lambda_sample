/**
* TimeBaseインスタンスの設定値を書き換え
*/

const aws = require('aws-sdk');
const credential = new aws.CredentialProviderChain();//Lambdaに設定されたroleを呼び出し
const opsworks = new aws.OpsWorks({
  apiVersion: '2013-02-18',
  region: 'ap-northeast-1',//opsworksの実行リージョン,
  credentialProvider:credential
});

exports.handler = (event, context, callback) => {
  const option = {
    startTime: process.env.startTime,//インスタンス稼働開始時間
    endTime: process.env.endTime,//インスタンス稼働終了時間
    instanceNum: parseInt(process.env.instanceNum),//適用するインスタンス台数
  }
  var server_status;
  var time_set = {
    '0': 'off',
    '1': 'off',
  }
  console.log(option)

  //全ての時間帯設定を上書きしたいので0時～23時まで一括指定する
  for(i=0; i <= 23; i++){
    if( option.endTime == 0) break;
    
    server_status = 'off'
    if( i >= option.startTime && i <= option.endTime ){
      server_status = 'on'
    }
    key = String(i);//stringでkey設定する必要がある
    time_set[key] = server_status;
  }

  //promiseで処理を定義
  var setTimeBasedInstance = function (instanceId) {
    return new Promise(function(resolve, reject) {
        //console.log('時間起動を設定: ' + instanceId);
        var params = {
          InstanceId: instanceId,
          AutoScalingSchedule: {
            Friday: time_set,
            Monday: time_set,
            Saturday: time_set,
            Sunday: time_set,
            Thursday: time_set,
            Tuesday: time_set,
            Wednesday: time_set
          }
        };
        
        opsworks.setTimeBasedAutoScaling(params, function(err, data) {
          if (err){
            console.log(err, err.stack); // an error occurred
            reject('時間設定に失敗しました' + instanceId);
            return;
          }

          console.log('処理成功');
          resolve(true);
        });
        
    });
  }

  //time based instanceのid一覧を取得
  var fetchTimeBasedInstance = function () {
    return new Promise(function(resolve, reject) {
      var params = {
        LayerId: 'xxx'
      };
      opsworks.describeInstances(params, function(err, response) {
        var instance;
        var instanceList = [];
        var processedCount = 0;
        if (err){
          console.log(err, err.stack); // an error occurred
          resolve(true);
        }
        
        //インスタンス一覧からtime baseのものだけ抽出
        for(i=0; i < response.Instances.length; i++){
          instance = response.Instances[i]
          console.log(instance.InstanceId + ":" +instance.AutoScalingType);
          if(instance.AutoScalingType == 'timer'){
            instanceList.push(instance.InstanceId);
          }
        }
        resolve(instanceList);
      });
    });
  }
  
  var promise_wait = function () {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 500);
        });
    };
  
  //処理実行
  fetchTimeBasedInstance().then(
    function(instanceList) {
      //指定された処理件数になるようにリストを調整
      if(option.instanceNum > 0) instanceList.splice(option.instanceNum + 1);
      instanceList.push(0);
      //reduceを使って動的にpromiseチェインを作成していく
      instanceList.reduce(function(promise, task){
          if(task === 0) return promise.then(function(){ context.succeed('done') });
          return promise.then( function(){ setTimeBasedInstance(task); }).then(promise_wait);
        },
        Promise.resolve()
        );
  });

  console.log('last');
};