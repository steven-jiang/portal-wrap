function  getAppInfo(callback){

 	var req=new MyRequest("/api/oauth2/token");
 	req._path="http://localhost:8080/web-portal/api/oauth2/token"
 	req._method="POST";
   req._contentType="application/json";
   var user={
   	client_id:"admin",
   	client_secret:"123456"
   };

   req._data=user;

   req.execute({

        success:function(result){
        	callback(result);
        },
        failure:function(result){
             callback(result);
        }
   });



}


function  getBucketList(scope,callback){

    var result=[];
    var queryCb=function(nextQuery){

        var url=scope+"/buckets";
        if(nextQuery!=undefined){
            url+="?paginationKey="+nextQuery;
        }
        var req=new MyRequest(url);

        req._token=context.getAppAdminContext()._token;

        var respCb=function(resp){
            var bucketIDs=resp["bucketIDs"];
            for(var i in bucketIDs){
                result.push(bucketIDs[i]);
            }
            var nextKey=resp["nextPaginationKey"];

            if(nextKey!=undefined){
                queryCb(nextKey);
            }else{
                callback(result);
            }
        }

        req.execute({

                success:respCb,
                failure:function(){
                    callback(result);
                }
        });
    };

    queryCb();
}

function listUserBucket(){

   var req=new MyRequest("users/query");
   req._method="POST";
   req._contentType="application/vnd.kii.userqueryrequest+json";
   req._token=context.getAppAdminContext()._token;
   var admin=context.getAppAdminContext();

   var query={};
   var clause={"clause":{type:"all"}};
   query["userQuery"]=clause;
   query["bestEffortLimit"]=50;

   req._data=query;
   var sum=0;
   var reduce=function(userList){

       var user=userList.pop();
       if(user==undefined){
            console.log("user's obj sum "+sum);
            return;
       }


       var userID=user["userID"];
       console.log("user "+user["emailAddress"]);

       listBucketRecCount("users",userID,function(count){
          sum+=count;
          reduce(userList);
       });
   }
   req.execute(function(resp){

        var userList=resp["results"];

        reduce(userList);

   });

}

function listBucketRecCount(scope,id,callback){

    var path="";
    if(scope==undefined){
        path=id;
    }
    if(scope=="users"){
        path=scope+"/"+id;
    }
    if(scope=="things"){
        path=scope+"/VENDOR_THING_ID:"+id;
    }
    var sum={};
    getBucketList(path,function(list){
          var admin=context.getAppAdminContext();
          var reduce=function(l){
            var name=l.pop();
            if(name==undefined){
                console.log("sum "+JSON.stringify(sum));
                if(callback!=undefined){
                    callback(sum);
                }
                return;
            }
            sum[name]=0;
            var cb={
                 success: function(bucket, query, count) {

                       console.log(bucket.getBucketName()+" count:"+count);
                       sum[name]+=count;
                       reduce(l);

                  },
                  failure:function(){
                       reduce(l);
                  }
            };
            var info=admin.bucketWithName(name);
            if(scope=="users"){
                var user=admin.userWithID(id);
                info=user.bucketWithName(name);
                info.countWithQuery(KiiQuery.queryWithClause(null),cb);
            }
            if(scope=="things"){
                  admin.loadThingWithVendorThingID(id,{
                    success:function(th){
                        var thInfo=th.bucketWithName(name);
                        thInfo.countWithQuery(KiiQuery.queryWithClause(null),cb);
                    },
                    failure:function(th){
                        reduce(l);
                    }
                  });
            }
          };

          reduce(list);
    });
}



function  doThingObjCount(){
    var admin=context.getAppAdminContext();

    var info=admin.bucketWithName("globalThingInfo");


    var totalSum={};

    var reduct=function(list,callback){


        var entry=list.pop();
        if(entry == undefined){
            callback();
            return;
        }

        var id=entry.get("thingID");

        console.log("count thing "+id);

        listBucketRecCount("things",id,function(count){
            for(var idx in count){
                if(totalSum[idx]==undefined){
                    totalSum[idx]=0;
                }
                totalSum[idx]=totalSum[idx]+count[idx];
            }
            console.log(" current sum "+JSON.stringify(totalSum));
            reduct(list);
        });
    }

    var cb={
         success: function(queryPerformed, resultSet, nextQuery) {

          reduct(resultSet,function(){
             if(nextQuery != null) {
                 info.executeQuery(nextQuery, cb);
             }else{
                 console.log("total sum "+JSON.stringify(totalSum));
             }
          });
        },

      failure: function(queryPerformed, anErrorString) {
          // do something with the error response
      }
    };

    info.executeQuery(KiiQuery.queryWithClause(null),cb);


}

function clearInvalidThing(){

    var admin=context.getAppAdminContext();

    var info=admin.bucketWithName("globalThingInfo");

    var reduct=function(list,callback){

        if(list.length==0){
            callback();
            return;
        }

        var entry=list.pop();

        var id=entry.get("thingID");

        var remote=entry.get("remote");

        var fun=function(param){
            console.log("param:"+JSON.stringify(param));
            reduct(list,callback);
        }

        admin.loadThingWithVendorThingID(id, {
            success:function(thing){
                if(remote==""){
                    fun(thing);
                }else{
                    thing.deleteThing({
                        success:fun,
                        failure:fun
                    });
                }
            },
            failure:function(err){
                if(remote==""){
                    info.set("remote","09184164");
                    info.save({
                        success:fun,
                        failure:fun
                    },true);
                }else{
                    fun(err);
                }
            }
        });
    }

    var callback={
         success: function(queryPerformed, resultSet, nextQuery) {

          reduct(resultSet,function(){
             if(nextQuery != null) {
                 bucket.executeQuery(nextQuery, callback);
             }else{
                console.log("finish");
             }
          });
        },

      failure: function(queryPerformed, anErrorString) {
          // do something with the error response
      }
    };

    info.executeQuery(KiiQuery.queryWithClause(null),callback);

}



function addIpInfo(){


	context.setUserLogin(userName,userPwd);


	context.runInUser(function(user){
        var ip=$("#ipAddress").val();

        var ipInfo=new IPInfo(ip);

        ipInfo.getGeoInfo(function(geoInfo){
            console.log("geoInfo:"+JSON.stringify(geoInfo));
        });
    });

}


function  scanInfo(){


  var bucket=context.getAppAdminContext().bucketWithName("globalThingInfo");

  var ipList=[];

  var reduce=function(list){
    if(list.length==0){
        return;
    }
    var entry=list.pop();

    var ip=entry.get("currAction")["ipAddress"];

    var info=new IPInfo(ip);
    info.getGeoInfo(function(geoInfo){
            if(geoInfo["city"]!=undefined){
	            entry.get("currAction")["geoInfo"]=geoInfo;
	            entry.save({
	                success:function(){
	                    reduce(list);
	                },
	                failure:function(){
	                    reduce(list);
	                }
	            });
	        }else{
	            reduce(list);
	        }
	});


  }
  var queryCallbacks = {
      success: function(queryPerformed, resultSet, nextQuery) {
          for(var i=0; i<resultSet.length; i++) {

             var entry=resultSet[i];
             var curr=entry.get("currAction");
             if(curr!=undefined){
                var ip=curr["ipAddress"];
                if(ip!=undefined){
                    ipList.push(entry);
                }
             }
          }

          // if there are more results to be retrieved
          if(nextQuery != null) {
              // get them and repeat recursively until no results remain
              bucket.executeQuery(nextQuery, queryCallbacks);
          }else{
            reduce(ipList);
          }
      },

      failure: function(queryPerformed, anErrorString) {
          // do something with the error response
      }
  };

  bucket.executeQuery(KiiQuery.queryWithClause(null), queryCallbacks);


}

function runScan(){

   context.runInAdmin(scanInfo);
}


 function testPwdInBanch(){


    /*var list={
    "78B3B90FFCA0":"1234","78B3B90FFEC1":"1234","78B3B90FFCCC":"1234","78B3B90FFDB4":"1234","0022C05A7A28":"1234",
    "0022C05A7A20":"1234","0022C05A7A38":"1234","0022C05A7A36":"1234","F43E6120D6A5":"1234","0022C05A7A30":"1234",
    "0022C05A7A1E":"1234","0022C05A7A0C":"1234","0022C05A7A26":"1234","0022C05A7A3B":"1234"
    "78B3B90FFC4C":"1234","78B3B91000CD","78B3B90FFD68","","","","","","",""

    };*/


    var adminCtx=context.getAppAdminContext();

    var bucket=adminCtx.bucketWithName("globalThingInfo");

    var list={};
    var array=[];
     // define the callbacks (stored in a variable for reusability)
    var size=100;
    var queryCallbacks = {
      success: function(queryPerformed, resultSet, nextQuery) {
          for(var i=0; i<resultSet.length&&i<size; i++) {

              var obj=resultSet[i];
              list[obj.getUUID()]="1234";
              array.push(obj.getUUID());
          }

          if(nextQuery != null  &&  Object.keys(list).length<size) {

              bucket.executeQuery(nextQuery, queryCallbacks);
          }else {

                context.setUserLogin(userName,userPwd);


                var action={"url":"www.kii.com/foo","version":"1.2.3b" };

           //      context.fireFun("upgradeLamp",{"lights":list,"action":action});

	      //      context.fireFun("fireLamp",{"lights":list,"action":{},"verify":true});

	        	var param={};
	            param["thingID"]=array;
	            param["adminPwd"]="12345678";
	            param["newRemotePwd"]="1111";

	        //    context.fireFun("batchChangeThingPwd",param);

	context.setUserLogin(userName,userPwd);


            	context.runInUser(function(u){
            	    var group=u.bucketWithName("light_groups");

            	    var obj=group.createObject();
            	    obj.set("name","big");
	               var ls={};
                  for(var l in array){
                      ls[array[l]]=true;
                  }
                  obj.set("lights",ls);

                  obj.save({
                    success:function(){
                        console.log("ok");
                    },
                    failure:function(){
                        console.log("fail");
                    }
                  });
            	});
          }
      },

      failure: function(queryPerformed, anErrorString) {
      }
    };

    bucket.executeQuery(KiiQuery.queryWithClause(null),queryCallbacks);




 }

 function operRemoteKii(){
    var app_id="531a4df7";
    var app_key="e4422476ceefdb6cf4eceef0677ddffe";
    var clientID="7a83c673460dab45606d15b2a0aa8d35";
    var secret="9190195a52a7e5e83dbceb98378e197fadf72260d847daf89f11f1a4011bfdcf";
    var url="https://api-cn3.kii.com/api";

   var remoteKii=remoteKiiInst(app_id,app_key,url);

   var entry = remoteKii.serverCodeEntry("getThingDetail");

    entry.execute({"thingID":"thing001"}, {
        success:function(entry,argument, execResult){
            console.log(execResult.getReturnedValue());
           // context.fireFun("getThingDetail",{"thingID":"78B3B90FFE94"});
            console.log(Kii.getAppID());
        },
        failure:function(err){
            console.log(err);
            //context.fireFun("getThingDetail",{"thingID":"78B3B90FFE94"});
        }
    })
 }

function addServer(){
    context.fireFun("maintainServerList",{"oper":"add","appID":"5318608a","appKey":"52659c75c002a3264a0896fc32979c4d","site":"https://api.kii.com"});

}