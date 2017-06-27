/**
* 定期的なメンテナンス + RDSクラス変更が面倒くさいので自動化スクリプト
*/
const aws = require('aws-sdk');
const credential = new aws.CredentialProviderChain();//Lambdaに設定されたroleを呼び出し
const rds = new aws.RDS({
  apiVersion: '2014-10-31',
  region: 'ap-northeast-1',
  credentialProvider:credential
});

const opsworks = new aws.OpsWorks({
  apiVersion: '2013-02-18',
  region: 'us-east-1',//opsworksの実行リージョン
  credentialProvider:credential
});

const option = {
  targetInstance: '',
  modifyClass: process.env.modifyClass
}

//opswprksで使うパラメーター
const opsworksPram = {
  stackID: 'xxx',
  appID: 'xxx',
  layerID: 'xxx',
  comment: 'maintenance start'
}

//メンテナンスの切り替えをcustom_jsonで制御しているので設定
const maintenanceFlg = true;
const deployJson = '';
exports.handler = (event, context, callback) => {
  //外部からオプションを渡せないのでエイリアス名でoption値を切り替える
  if(context.invokedFunctionArn.match(/:stg/)){
    option.targetInstance = 'xxx'
  }else if(context.invokedFunctionArn.match(/:prd/)){
    option.targetInstance = 'xxx';
    opsworksPram.stackID = 'xxx';
    opsworksPram.layerID = 'xxx';
    opsworksPram.appID = 'xxx';
  }

  console.log(option);
  console.log(opsworksPram);

  //promiseで処理を定義
  //RDS変更
  var modifyRds = function () {
    return new Promise(function(resolve, reject) {
        var params = {
          DBInstanceIdentifier: option.targetInstance,
          DBInstanceClass: option.modifyClass,
          ApplyImmediately: true
        };
        
        rds.modifyDBInstance(params, function(err, data) {
          if (err){
            console.log('処理失敗');
            console.log(err, err.stack); // an error occurred
            resolve(false);
          }else{
            console.log(data);
            resolve(true);
          }
        });
    });
  }

  // opsworksにデプロイをかけてメンテナンス表示を切り替え
  var switchMeintenance = function(){
    return new Promise(function(resolve, reject){
        var params = {
          Command: {
            Name: 'deploy',
            Args: {"migrate":["true"]}
          },
          StackId: opsworksPram.stackID,
          LayerIds: [ opsworksPram.layerID],
          AppId: opsworksPram.appID,
          Comment: opsworksPram.comment,
          CustomJson: deployJson
        };
        
        opsworks.createDeployment(params, function(err, data) {
          if (err){
            console.log('処理失敗');
            console.log(err, err.stack); // an error occurred
            resolve(false);
          }else{
            console.log(data);
            resolve(true);
          }
        });
    });
  }

  //処理実行
  modifyRds().then(
    function(results) {
      if(! results) context.fail(false);
      return switchMeintenance();
    }
  ).then(
    function(results) {
      if(results) context.succeed('done');
      else context.fail(false);
    }
  );
  console.log('last');
};