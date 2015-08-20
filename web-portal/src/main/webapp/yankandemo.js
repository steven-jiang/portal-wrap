
KiiUser.prototype.getNotNullUserName=function(){
	var userName=this.getDisplayName();
	if(userName==null){
		userName=this.getEmailAddress();
		if(userName==null){
			userName=this.getPhoneNumber();
			if(userName==null){
				userName=this.getID();
			}
		}
	}
	return userName;
};

KiiClause.not = function(clause) {
  return KiiClause.createWithWhere("not", [clause]);
};



//==============================================
//custom request
//==============================================


RemoteKiiRequest = (function(){
	
	function RemoteKiiRequest(entry){


	    this.path =entry.get("site")+ "/api/apps/" + (entry.get("appID")) +"/server-code/versions/current/onMsgReceive";
		
	    this.method = "POST";
	    this.headers = {
	      "accept": "*/*"  
	    };


	    this.headers['x-kii-appid'] = entry.get("appID");
        this.headers['x-kii-appkey'] = entry.get("appKey");
        this.headers['x-kii-sdk'] = KiiSDKClientInfo.getSDKClientInfo();
        this.headers['Content-Type']= "application/json";


		var _this=this;

		this._success = function(json, status) {
        	console.log("success:"+json+" \n status:"+status);
        };
        this._failure = function(errString, status) {
        	console.log("failure:"+errString+" \n status:"+status);
        };
	    
	    this.onSuccess=function(anything, textStatus,jqXHR) {
			  
	        if ((200 <= (_ref1 = jqXHR.status) && _ref1 < 400)) {
	            if (jqXHR.status==204) {
	              return _this._success(null, textStatus);
	            } else {
					if (anything.errorCode != null) {
					  var errString=anything.errorCode+anything.message;
					  return _this._failure(errString, jqXHR.status, anything.errorCode);
	                } else {
	                  return _this._success(anything, textStatus);
	                }
	            }
	        } else {
	            var errString = xhr.status + " : " + _this._path;
	            var json = decodeURIComponent(jqXHR.responseText);
//	            if (json.errorCode != null) {
//	                errString = json.errorCode+json.message;
//	             }
	            return _this._failure(errString, jqXHR.status,resp);
	       }
	    };
		
		this.onError=function(jqXHR,textStatus,errorThrown){
            var errString = textStatus + " : "  + _this._path;
            var resp = decodeURIComponent(jqXHR.responseText);
//            if (json != null) {
//              if (json.errorCode != null) {
//                  errString = json.errorCode;
//                if (json.message != null) {
//                  errString += ": " + json.message;
//                }
//              }
//            }
            return _this._failure(errString, jqXHR.status,resp);
       };

   	}

	RemoteKiiRequest.prototype.execute=function(param,callback){

		if(callback["success"]!=null){
			this._success=callback["success"];
		}
		if((callback["failure"]!=null)){
			this._failure=callback["failure"];
		}

		var ajaxParam={};
		ajaxParam["success"]=this.onSuccess;
        ajaxParam["error"]=this.onError;

		ajaxParam["type"]=this.method;
		ajaxParam["headers"]=this.headers;
		ajaxParam["data"]=JSON.stringify(param);

		$.ajax(this.path,ajaxParam);

	}
	
	
	return RemoteKiiRequest;
})();



function recordLog(log,done,type) {

    console.log("log:"+log+" type:"+type);
    var result={};

    result["success"]=false;
    result["error_type"]=type;
    result["error_info"]=log;

    if(typeof(done)=="function"){
        done(result);
    }

}

function finish(done,params){
    if(params==undefined){
        params={};
    }
    params["success"]=true;
    done(params);

}

function createObj(field,val){
	var obj={};
	obj[field]=val;
	return obj;
}

function is409(err){

    return /409 error code/.test(err.toLocaleString());
}

//=================================
//action obj
//=================================

FireAction =  (function(){

	function FireAction(user,done,adminCtx){
		this.user=user;
		this.done=done;
		this.adminCtx=adminCtx;
	}
	
	FireAction.copyAction=function(obj){
		var act={};
		var src=obj;
		if(obj._customInfo!=undefined){
			src=obj._customInfo;
		}
		var array=["brightness","CT","color","state","mode"];

		var  filter=function(v){
			if(src[v]!=undefined){
				act[v]=src[v];
			}
		}

		for(var i in array){
			filter(array[i]);
		}
		if(act["mode"]==undefined){
		    act["mode"]=0;
		}
		return act;
		
	}
	

	FireAction.mergeObj=function(src,des){

		if(src==undefined){
			src={};
		}
		for(var k in des){
			src[k]=des[k];
		}
		return src;
		
	}
	
	
	FireAction.prototype.fireThing=function(things,callback,cmd){
		
		var thingIDs=Object.keys(things);
		if(thingIDs.length==0){
			callback();
			return;
		}
		var thingID=thingIDs.pop();
		
		var action=things[thingID];
		delete things[thingID];

		var thing=new MyThing(thingID,this.done,this.adminCtx);

		var _this=this;
		
		var fun=function(){
			_this.fireThing(things,callback,cmd);
		};

		var bucket=this.user.bucketWithName("lights");

		var info=bucket.createObjectWithID(thingID);
		info.refresh({
		    success:function(obj){
		          thing.lightPwd=obj.get("remote_pwd");
                  thing.bindThing(function(){
                     thing.doAction({"action":action},_this.user.getNotNullUserName(),cmd,
                	    fun,fun,_this.schedInfo);
                  },fun);
		    },
		    failure:fun
		});



		
	}
	
	FireAction.prototype.findGroup=function(name,action,callback){
		
		var bucket=this.user.bucketWithName("light_groups");
		
		var group=bucket.createObjectWithID(name);
		var _this=this;
		group.refresh({
			success:function(entry){
				var things=entry.get("lights");
				var thingAct=action;
				if(thingAct==undefined){
					thingAct=FireAction.copyAction(entry);
				}
				for(var t in things){
					things[t]=thingAct;
				}
				callback(things);
			},
			failure:function(error){
				recordLog(error,_this.done,"get_group_info_failure",_this.adminCtx);
			}
		});
	}
	
	FireAction.prototype.findScene=function(name,directAction,callback){
		var bucket=this.user.bucketWithName("light_scenes");
		var scene=bucket.createObjectWithID(name);
		
		var _this=this;
		scene.refresh({
			success:function(entry){
				var things={};

				var members=entry.get("scene_detail");
				var groups=[];
				
				for(var n in members){

					var val=members[n];
					if(val["group_id"]!=undefined &&  val["group_id"]!= "" ){
						var fullInfo={};
						fullInfo["type"]="group";
						fullInfo["name"]=val["group_id"];
						if(directAction){
							fullInfo["action"]=directAction;
						}else{
							fullInfo["action"]=FireAction.copyAction(val);
                        }
						groups.push(fullInfo);
					}else if(val["light_id"]!=undefined && val["light_id"]!= ""){
						var fullInfo={};
						fullInfo["type"]="thing";
						fullInfo["name"]=val["light_id"];
						if(directAction){
							fullInfo["action"]=directAction;
						}else{
							fullInfo["action"]=FireAction.copyAction(val);
                        }
                        things[val["light_id"]]=fullInfo;
					}
				}
				
				var reduce=function(groupList){
					
					if(groupList.length==0){
						callback(things);
						return;
					}
					
					var obj=groupList.pop();
					var objName=obj["name"];

					var groupAct=obj["action"];
					_this.findGroup(objName,groupAct,
							function(thingsInGroup){
								things=FireAction.mergeObj(things,thingsInGroup);
								reduce(groupList);
							}
					);
				};
				
				reduce(groups);
			},
			failure:function(error){
				recordLog(error,_this.done,"get scene info fail");
			}
		});
	}
	
	FireAction.prototype.resetPwd=function(thingID,callback){
		
		var bucket=this.user.bucketWithName("lights");
		
		var l=bucket.createObjectWithID(thingID);
		
		l.refresh({
			success:function(light){
				light.set("remote_pwd",null);
				light.set("admin_pwd",null);
		
				light.saveAllFields({
					success:function(){
						callback();
					},
					failure:function(){
						callback();
					}
				});
			}
			,failure:function(light,err){
		        	callback();
//				recordLog(err,this._done,"get_light_fail");
			}
		})
		
	}
	
	FireAction.prototype.fireByCommand=function(name,type,action,callback,cmd){
		
		var _this=this;
		if(cmd==undefined){
			cmd="command";
		}
		var onfinish=function(things){
			_this.fireThing(things,function(){
				callback(_this.done);
			},cmd);
		};
		
		switch(type){
			
		case "scene":
			this.findScene(name,undefined,onfinish);
			break;
		case "group":
			this.findGroup(name,action,onfinish)
			break;
		case "things":
			var things={};
			for(var k in name){
				things[name[k]]=action;
			}
			onfinish(things);
		}
	}
	
	FireAction.prototype.addACL=function(acl,callback){
		
		var entry=KiiACLEntry.entryWithSubject(this.user,KiiACLAction.KiiACLBucketActionCreateObjects);
		
		acl.putACLEntry(entry);
		
		var _this=this;
		acl.save({
			success:callback,
			failure:function(error){
				recordLog(error,_this.done,"add_acl_failure");
			}
		});
	}
	
	FireAction.prototype.removeThingBind=function(thingID,callback){
		

		var _this=this;
		this.removeLight(thingID,
			function(){
				_this.removeThingInGroup(thingID,function(){

				    var thing=new MyThing(thingID,_this.done,_this.adminCtx);
                    thing.bindThing(function(){
                    	thing.removeACL(
                    	    "CREATE_OBJECTS_IN_BUCKET",
                    	    _this.user.getID(),
                    		callback);
                    });
    			});
		});
	}
	
	FireAction.prototype.removeLight=function(thingID,callback){
		var bucket=this.user.bucketWithName("lights");
		
		var thing=bucket.createObjectWithID(thingID);
		
		var _this=this;

		thing.delete({
			success:function(del){
				callback(thingID);
			},
			failure:function(del,err){
				recordLog(error,_this.done,"add_acl_failure");
			}
		});
	}
	
	FireAction.prototype.removeThingInGroup=function(thingID,callback){
		var bucket=this.user.bucketWithName("light_groups");
		var clause=KiiClause.equals("lights."+thingID,true);
		
		var _this=this;
		var objs=[];
		
		var deleteAll=function(list){
			
			if(list.length==0){
				callback();
				return;
			}
			
			var group=list.pop();
			
			var lights=group.get("lights");
			delete lights[thingID];
			group.set("lights",lights);
			group.save({
				success:function(o){
					return deleteAll(list);
				},
				failure:function(o,err){
					recordLog(err,_this.done,"Update_group_fail");
				}
			});
		}
		var queryClb={
			success:function(queryPerformed, resultSet, nextQuery){
				for(var i=0; i<resultSet.length; i++) {
					objs.push(resultSet[i]);
				}
			    if(nextQuery != null) {
			        bucket.executeQuery(nextQuery, queryClb);
			    }else{
			    	deleteAll(objs);
			    }
			},
			failure:function(queryPerformed, anErrorString){
				recordLog(anErrorString,_this.done,"query_group_by_thingID_failure");
			}
		};
		
		bucket.executeQuery(KiiQuery.queryWithClause(clause),
			queryClb
		);
	}
	
	
	FireAction.prototype.registThing=function(thingObj){
		
		var thingID=thingObj.get("MAC");
		var model=thingObj.get("model");
		
		var thing=new MyThing(thingID,this.done,this.adminCtx);
		
		var _this=this;
		
		thing.registThing(
			{"model":model,"_thingType":"Light"},
			function(th){
				thingObj.set("registed",true);
				thingObj.save({
					success:function(entry){
						thing.addThingOwned(_this.user);
					},
					failure:function(err){
						recordLog(err,_this.done,"save_thing_failure");
					}
				});
			}
		);
	}
	
	return FireAction;
	
})();



//===================================================
//thing obj
//===================================================


MyThing =  (function(){
	
	
	function MyThing(name,done,adminCtx){
		
		this.done=done;
		this.adminCtx=adminCtx;
		this.thingID=name;

	}

	MyThing.prototype.getInfoBucket=function(){

	        return this.adminCtx.bucketWithName("globalThingInfo");
	}

	MyThing.prototype.loadThingInfo=function(callback,failCall){

	    var bucket=this.getInfoBucket();

	    var obj=bucket.createObjectWithID(this.thingID);

        var _this=this;
	    obj.refresh({

			success: function(entry) {
			    callback(entry);
			},

			failure: function(theObject, err) {
			    if(failCall){
			        failCall(theObject);
			    }else{
				    recordLog(err,_this.done,"get globe thing status fail");
                }
			}

	    });

	}

	MyThing.prototype.bindThing=function(callback,failCall){

	    var _this=this;
	    if(!this.adminCtx){
             KiiThing.loadWithVendorThingID(_this.thingID, {

                success:function(th){
                    _this.thing=th;
                    callback(th);
                },

                failure:function(err){
                    if(failCall){
                        failCall(err);
                    }else{
                        recordLog(err,_this.done,"load thing obj fail");
                    }
                }
             });
	     }else{
	          this.adminCtx.loadThingWithVendorThingID(_this.thingID, {

                   success:function(th){
                       _this.thing=th;
                       callback(th);
                   },

                   failure:function(err){
                       if(failCall){
                          failCall(err);
                       }else{
                            recordLog(err,_this.done,"load thing obj fail");
                       }
                   }
             });
	     }

	}
	
	MyThing.prototype.addThingOwned=function(user){
//		var globeThing=this.getInfoBucket();
//		var newThing=globeThing.createObjectWithID(this.thingID);
		var _this=this;
		
		var userID=user.getID();

		this.loadThingInfo(function(obj){
		  var owned=obj.get("owned");
          if(owned==undefined){
        	owned={};
          }
          owned[userID]=true;
          obj.set("owned",owned);
          obj.save({
            success:function(json){
        		var ctrlBucket=_this.thing.bucketWithName("LEDControl");
        		 _this.addACL(ctrlBucket.acl(),user);
        	},
        	failure:function(json,err){
        		recordLog(err,_this.done,"save globe thing status fail");
        	}
          });
		});

	}


	
	MyThing.prototype.newThingStatus=function(model,callback){
		
		var globeThing=this.getInfoBucket();
		var newThing=globeThing.createObjectWithID(this.thingID);
		
		newThing.set("thingID",this.thingID);
		newThing.set("owned",{});
		newThing.set("model",model);
		newThing.set("remote","");

		var _this=this;

		var globeMsg=this.adminCtx.bucketWithName("FirmwareUpgrade_"+model);
		this.addSubscribe(globeMsg,function(entry){

		    var firebucket=_this.thing.bucketWithName("LEDControl");

		    _this.addSubscribe(firebucket,function(){
		    	newThing.saveAllFields({
            		success:function(json){
            				    var mq=new MsgQueue(_this.done,_this.adminCtx);
            				    mq.thingAddMsg(_this.thingID,model,
            				            function(){
                                            callback(json);
                                        });

            		},
            		failure:function(obj,err){
            			recordLog(err,_this.done,"save_globe_thing_fail");
            		}
            	});

		    })

		});
	}

    MyThing.prototype.addThing=function(thingData,callback){


        var fields={};

        fields["adminPwd"] = "12345678";
	    fields["remotePwd"]="1234";

        fields["_vendorThingID"]=this.thingID;
        fields["_password"]="123456";

        var model=thingData["model"];

	    for(var k in thingData){
	        fields[k]=thingData[k];
	    }

        var _this=this;
	    this.adminCtx.registerThing(fields,{
	        success:function(th){
	            _this.thing=th;
	            callback();
	        },
	        failure:function(err,status){
                if(is409(err)){
                    _this.bindThing(callback);
                }else{
	                recordLog(err,_this.done,"thing_regist_failure");
	            }
	        }
	    })
    }
	
	MyThing.prototype.registThing=function(thingData,onRegist){
	    var model=thingData["model"];
	    var _this=this;

	    this.loadThingInfo(function(th){

              var remote=th.get("remote");
              if( remote == undefined){
                  _this.addThing(thingData,function(){
                      _this.newThingStatus(model,onRegist);
                  })
              }else if(remote!=""){
                recordLog(th,_this.done,"The_thing_exist");
              }else{
                 _this.addThing(thingData,function(){
                    _this.newThingStatus(model,onRegist);
                 })
              }
        },function(err){
              _this.addThing(thingData,function(){
                   _this.newThingStatus(model,onRegist);
              })
        });
	}

	MyThing.prototype.saveThingProp=function(newField,onReceive){

	    var _this=this;

	    this.thing.fields=newField;

	    this.thing.update({
	        success:function(th){
	            _this.thing=th;
	            onReceive(th.fields);
	        },
	        failure:function(err){
	           recordLog(err,_this.done,"thing_updateInfo_failure");
	        }
	    });
	}

	MyThing.prototype.getSubscribe=function(bucket,callback){

		var bucketObj=this.thing.bucketWithName(bucket);

		var sub=this.thing.pushSubscription();

        sub.isSubscribed(bucketObj, {
            success:function(subscription, topic, isSubscribed){
                callback(isSubscribed);
            },
            failure:function(){
                callback(false);
            }
        });
	}

	MyThing.prototype.addSubscribe=function(bucket,callback){

        var _this=this;

        var sub=this.thing.pushSubscription();

        sub.subscribe(bucket, {
             success:function(subscription, topic){
                 callback(true);
             },
             failure:function(err){
                if(is409(err)){
                    callback(false);
                }else{
                    recordLog(err,_this.done,"thing_addSubscribe_failure");
                }
             }
        })

	}

	MyThing.prototype.delSubscribe=function(bucket,callback){

        var _this=this;

        var sub=this.thing.pushSubscription();

        sub.unsubscribe(bucket, {
             success:function(subscription, topic){
                 callback(true);
             },
             failure:function(err){
                recordLog(err,_this.done,"thing_addSubscribe_failure");
             }
        })

	}


	MyThing.prototype.addACL=function(acl,user){
		
		var entry=KiiACLEntry.entryWithSubject(user, KiiACLAction.KiiACLBucketActionCreateObjects);
		
		acl.putACLEntry(entry);
		var _this=this;
		acl.save({
			success:function(){
				finish(_this.done);
			},
			failure:function(theACL, anErrorString){
			    recordLog("finish",_this.done,"add acl fail");
			}
		});
	}
	
	MyThing.prototype.removeACL=function(acl,user,callback){

		var entry=KiiACLEntry.entryWithSubject(user, KiiACLAction.KiiACLBucketActionCreateObjects);

    	acl.removeACLEntry(entry);
    	acl.save({
    		success:function(){
    				callback(true);
    	    },
    		failure:function(theACL, anErrorString){
    				callback(false);
    		}
    	});
	}



	MyThing.prototype.doAction=function(params,from,cmd,callback,onFail,other){
		
		if(onFail==undefined){
			onFail=function(err){
				recordLog(err,_this.done,"do_action_failure");
			};
		}
		var _this=this;
		
		var operFun=function(){
			var bucket=_this.thing.bucketWithName("LEDControl");
		
			var obj=bucket.createObject();
			for(var k in params){
				obj.set(k,params[k]);
			}
			obj.set("from",from);
			obj.set("type",cmd);
			obj.set("scheduleName",other);
		
			obj.save({
				success:function(entry){
					callback();
				},
				failure:function(err){
					onFail(err);
				}
			});
		}
		
		if(_this.lightPwd==false){
			operFun();
		}else{

		    var thingPwd=_this.thing.fields["remotePwd"];
			if(_this.lightPwd==thingPwd){
				operFun();
			}else{
				onFail("Password_not_match");
			}
		}
	}
	
	
	MyThing.prototype.savePwd=function(newAdminPwd,newRemotePwd,callback,adminPwd){
		
		var _this=this;
		var pwd=this.thing.fields["adminPwd"];

		if(pwd==""|pwd==undefined){
			pwd="12345678";
		}
		if(pwd!=adminPwd){
            callback(false);
            return;
        }
		var newField={};
		newField["adminPwd"]= pwd;
		newField["remotePwd"]= this.thing.fields["remotePwd"];

		var verifyAdminPwd=function(val){
            if(val==undefined){
                return false;
            }
            var str=String(val);
            if(str==""||str.trim()==""){
            	return false;
            }
            return true;
        };
		var verifyRemotePwd=function(val){
        	return verifyAdminPwd(val)&&(/^[\d]{4}$/.test(val));
		}

        var sign=false;
		if(verifyAdminPwd(newAdminPwd)){
			if(newAdminPwd==this.thing.fields["adminPwd"]){
                callback(true);
                return;
            }else{
                newField["adminPwd"]= newAdminPwd;
            }
            sign=true;
		}
		if(verifyRemotePwd(newRemotePwd)){
			if(newRemotePwd==this.thing.fields["remotePwd"]){
                callback(true);
                return;
            }else{
                newField["remotePwd"]= newRemotePwd;
            }
            sign=true;
		}

        if(!sign){
            callback(false);
            return;
        }
		_this.saveThingProp(newField,function(){

			this.loadThingInfo(function(obj){
				var owners=obj.get("owned");
            	if(owners!=undefined){
            		var list=Object.keys(owners);
            		var reduct=function(l){
            			if(l.length==0){
            				callback(true);
            				return;
            			}
            			var user=l.pop();
            			var action=new  FireAction(_this.adminCtx.userWithID(user),_this.done,_this.adminCtx);
            			action.resetPwd(_this.thingID,function(){
            				reduct(l);
            			});
            		}
            		reduct(list);
            	}else{
            		callback(true);
            	}
			},function(err){
			    callback(false);
			});
		});
    }
	
	MyThing.prototype.clearThing=function(callback){

		var _this=this;

		var bucket=this.getInfoBucket();

        var obj=bucket.createObjectWithID(this.thingID);

        var _this=this;
        obj.refresh({
        	success: function(th) {
        		 if(th.get("remote")!=""){
                    callback();
                    return;
                 }
                 _this.bindThing(function(){
                    _this.thing.deleteThing({
                      success:function(){
                        callback();
                      },
                      failure:function(js,err){
                        recordLog(err,_this.done,"delete thing fail");
                      }
                   });
                 });
        	},
        	failure: function(theObject, err) {
        	    recordLog(err,_this.done,"get thing info fail");
        	}
        });

	}

	MyThing.prototype.addThingInfo=function(appID,model,callback){

	    var globalThing=this.getInfoBucket();
	    var newThing=globalThing.createObjectWithID(this.thingID);

	    newThing.set("thingID",this.thingID);

	    newThing.set("model",model);

	    newThing.set("remote",appID);

        var _this=this;
        newThing.saveAllFields({
            success:function(json){
                callback(json);
            },
            failure:function(json,err){
                recordLog(err,_this.done,"save thing fail");
            }
        });
	}

	MyThing.prototype.updateThingInfo=function(params,callback){


        this.loadThingInfo(function(json){
            for(var k in params){
            	json.set(k,params[k]);
            	json.save({
            	     success:function(js){
            	                callback(js);
            	            },
            	     failure:function(js,err){
            	                recordLog(err,_this.done,"update thing info fail");
            	     }
            	})
            }
        });

    }
	
	MyThing.prototype.recordAction=function(newAction,callback){
		
		var bucket=this.getInfoBucket();

		var thing=bucket.createObjectWithID(this.thingID);

        var _this=this;

//		var saveThingInfo=function(thing){

            var action=thing.get("currAction");
            if(action==undefined){
                action={};
            }

            for(var k in newAction){
                action[k]=newAction[k];
//    			thing.set(k,newAction[k]);
            }
            thing.set("currAction",action);

            thing.save({
                success:function(){
                    if(thing.get("remote")==""&&
                            (newAction["geoInfo"]||newAction["firmwareVersion"])){
//                        var mq= new  MsgQueue(_this.done,_this.adminCtx);
//                        mq.thingUpdate(_this.thingID,newAction["geoInfo"],newAction["firmwareVersion"],function(){
                            callback(newAction);
//                        });
                    }else{
                        callback(newAction);
                    }
                },
                failure:function(obj,err){
                    recordLog(err,_this.done,"save_thing_status_failure");
                }
            });
//		}

        /*
		th.refresh({
        	success:function(thing){
                saveThingInfo(thing);
        	},
        	failure:function(){
        	    thing.set("thingID",_this.thingID);
        	    thing.set("remote","");

                thing.saveAllFields({
                    success:function(th){
                        saveThinginfo(th);
                    },
                    failure:function(err){
                        recordLog(err,_this.done,"add_thing_global_info_failure");
                    }
                });
        	}
        });
        */

	}
	
	MyThing.prototype.recordControlLog=function(action,requestID,callback){

		var bucket=this.thing.bucketWithName("LEDControlLog");
		var newLog=bucket.createObject();
		newLog.set("finallyStatus",action);
		var _this=this;
		if(requestID==undefined){
			newLog.set("request","local");
			newLog.save({
				success:function(json){
					callback();
				},
				failure:function(json,err){					
					recordLog(err,_this.done,"SAVE_WITHOUT_REQ_CONTROL_LOG_FAIL");
				}
			})
		}else{
			var reqBucket=this.thing.bucketWithName("LEDControl");
			var req=reqBucket.createObjectWithID(requestID);
		
			req.refresh({
				success:function(obj){
					newLog.set("request",req._customInfo);
					newLog.save({
						success:function(json){							
							callback();
						},
						failure:function(json,err){							
							recordLog(err,_this.done,"SAVE_WITHREQ_CONTROL_LOG_FAIL");
						}
					})
				},
				failure:function(obj,err){					
					recordLog(err,_this.done,"GET_CONTROL_REQUEST_FAIL");
				}
			});
		}
	}
	
	return MyThing;
	
})();

//=====================================
//schedule
//=====================================
KiiSchedule = (function(){
	
	function KiiSchedule(userName,done,adminCtx){
		this.userName=userName;
		this.done=done;
		this.adminCtx=adminCtx;
	}
	
	KiiSchedule.prototype.expandLightSch=function(schObj){
		
		var time=schObj.get("time");
		var timezone=schObj.get("timezone");
		if(timezone== undefined){
			timezone= 8;
		}
		time-=60*timezone;
		var sign=time<0;
		var currTime=time;
		if(sign){
			currTime+=60*24;
		}
		var hour=Math.floor(currTime/60);
		var minute=currTime-(60*hour);

		var dayMap=[
			"mon",
			"tue",
			"wed",
			"thu",
			"fri",
			"sat",
			"sun"
		];
		var dayMapShift=[
			"sun",
			"mon",
			"tue",
        	"wed",
        	"thu",
        	"fri",
        	"sat"
		];


		var sign=false;
		var week=schObj.get("repeat");
		if(week!=undefined){
			var strWeek="";
			for(var i in week){
				if(week[i]){
					sign=true;
					if(sign){
						strWeek+=dayMapShift[i]+",";
					}else{
						strWeek+=dayMap[i]+",";
					}
				}
			}
		}
		if(sign){
			schObj.set("cronStr",minute+" "+hour+" * * "+strWeek);
		}else{
			var delay={};
			var now=new Date();
			now.setMinutes(0);
			now.setHours(0);
			now.setMilliseconds(0);
			now.setSeconds(0);

			delay["currTime"]=now.getTime();
			delay["minute"]=time;
			schObj.set("delay",delay);
			schObj.set("upper",currTime+60*60*1000);
		}
		
		var isCloseAll=false;
		if(schObj.get("light_id")!=undefined &&  schObj.get("light_id")!=""){
			schObj.set("type","things");
			schObj.set("target",[schObj.get("light_id")]);
		}else if(schObj.get("group_id")!=undefined && schObj.get("group_id")!=""){
			schObj.set("type","group");
			schObj.set("target",schObj.get("group_id"));
		}else if(schObj.get("scene_id")!=undefined && schObj.get("scene_id")!="" ){
			schObj.set("type","scene");
			schObj.set("target",schObj.get("scene_id"));
			isCloseAll=schObj.get("closeAll")!=undefined;
		}

		schObj.set("lower",currTime-60*60*1000);


		schObj.set("action",FireAction.copyAction(schObj));
		if(isCloseAll){
			schObj.set("action",{"status":0});
		}
		return schObj;
		
		
	}

	KiiSchedule.prototype.removeRetainSchedule=function(time,callback){

	    var bucket=this.adminCtx.bucketWithName("schedule");
        var clause=KiiClause.lessThan("upper",time);

       var results=[];

        var _this=this;
       var oper=function(list){

            var obj=list.pop();
            if(obj==undefined){
                callback();
                return;
            }

            obj.delete({
                success:function(){
                    oper(list);
                },
                failuer:function(err){
                    console.log(err);
                    oper(list);
                }
            })
       }

       var queryCallbacks = {
           success: function(queryPerformed, resultSet, nextQuery) {
               for(var i=0; i<resultSet.length; i++) {
                   results.push(resultSet[i]);
               }

               if(nextQuery != null) {
                   bucket.executeQuery(nextQuery, queryCallbacks);
               }else{
                   oper(results);
               }
           },

           failure: function(queryPerformed, anErrorString) {
               _this.done(anErrorString);
           }
       };

       bucket.executeQuery(KiiQuery.queryWithClause(clause),queryCallbacks);

	}
	
	KiiSchedule.prototype.removeSchedule=function(name){
		var id=name;
		
		var bucket=this.adminCtx.bucketWithName("schedule");
		
		var obj=bucket.createObjectWithID(id);
		
		var _this=this;
		obj.delete({
			success:function(theObject){
					finish(_this.done);
			},
			failure:function(theObject, anErrorString){
  				recordLog(anErrorString,_this.done,"add_schedule_failure",_this.adminCtx);
			}
		});
	}



	KiiSchedule.prototype.operateSchedule=function(obj,name){
	
		var id=name;
	    var bucket=this.adminCtx.bucketWithName("schedule");
		
		if(obj.get("lower")==undefined){
			obj.set("lower",-1);
		}
		if(obj.get("upper")==undefined){
			obj.set("upper",1e14);
		}

	    var newSchedule=bucket.createObjectWithID(id);
		newSchedule.set("lower",obj.get("lower"));
		newSchedule.set("upper",obj.get("upper"));

	    var cron=obj.get("cronStr");
		if(cron == undefined ){
			this.expandDelayDesc(obj.get("delay"),newSchedule);
		}else{
	    	this.expandFullCron(cron,newSchedule);
		}
		
	    newSchedule.set("name",obj.get("name"));
		newSchedule.set("fromUser",this.userName);
		
		newSchedule.set("target",obj.get("target"));
		newSchedule.set("type",obj.get("type"));
		newSchedule.set("action",obj.get("action"));
		
		
		newSchedule.set("enable",(obj.get("enabled")==1));
		
		var _this=this;
   		newSchedule.saveAllFields({
  			success:function(json){
				finish(_this.done);
  			},
  			failure:function(json, anErrorString){
  				recordLog(anErrorString,_this.done,"add_schedule_failure",_this.adminCtx);
  	  		}
    	},true);
		
		
	}

	KiiSchedule.prototype.expandDelayDesc=function(delayDesc,newSchedule){

		
		var date=new Date(delayDesc["currTime"]);
		var min=delayDesc["minute"];
		if(min == undefined){
			min=0;
		}
		var hour=delayDesc["hour"];
		if(hour==undefined){
			hour=0;
		}
		var day=delayDesc["day"];
		if(day==undefined){
			day=0;
		}
		var diff=min*60*1000+hour*60*60*1000+day*24*60*60*1000;

		var target=new Date(date.getTime()+diff);
		
		newSchedule.set("minutes",createObj(target.getMinutes(),true));
		newSchedule.set("hours",createObj(target.getHours(),true));
		newSchedule.set("days",createObj(target.getDate(),true));
		newSchedule.set("months",createObj(target.getMonth(),true));
		newSchedule.set("weeks",this.expandFull(7));

		newSchedule.set("upper",target.getTime()+1000*60*60*24);
		
		return;
	}
	
	

	KiiSchedule.prototype.expandFullCron=function(cron,newSchedule){
	
		var  cronList=cron.split(/\s+/);
	
		/**  1,2,3   1/5   1-5   5*/
		var minutes=this.expandCron(cronList[0],60);
		newSchedule.set("minutes",minutes);
		var hours=this.expandCron(cronList[1],24);
		newSchedule.set("hours",hours);
	
		if(cronList[2]!="*"){
			newSchedule.set("days",this.expandCron(cronList[2],32));
		}else{
			newSchedule.set("days",this.expandFull(32));
		}
	
		if(cronList[3]!="*"){
			newSchedule.set("months",this.expandCron(cronList[3],12,1));
		}else{
			newSchedule.set("months",this.expandFull(12));
		}
	
		if(cronList[4]!="*"){
			var weeks=this.expandWeek(cronList[4]);
			newSchedule.set("weeks",weeks);
		}else{
			newSchedule.set("weeks",this.expandFull(7));
		}
	
		return;
	
	}

	KiiSchedule.prototype.expandFull=function(max){
	   var result={};

	   for(var i=0;i<max;i++){
		   result[String(i)]=true;
	   }
	   return result;
	}

	KiiSchedule.prototype.expandWeek=function(cron){
	
		var result={};
		var dayMap={
			"mon":1,
			"tue":2,
			"wed":3,
			"thu":4,
			"fri":5,
			"sat":6,
			"sun":0
		}
	
		if(cron.match(/\w+-\w+/)){
			//1-3
			var idx=cron.indexOf("-");
		
			var start=dayMap[cron.substring(0,idx).toLowerCase()];

			var end=dayMap[cron.substring(idx+1).toLowerCase()];
		
			if(start>end){
				end+=7;
			}
		
			if(start!=null&&end!=null){
				for(var i=start;i<=end;i++){
				
					result[String(i%7)]=true;
				}
			}
		
		 }else if (cron.match(/([\w+]+,)+/)){
			//1,3,5
			var array=cron.split(",");
		
			for(var v in  array){
				var i=dayMap[array[v].toLowerCase()];
				if(i!=null){
					result[String(i)]=true;
				}
			}
		}else{
			var i=dayMap[cron.toLowerCase()];
			if(i!=null){
				result[String(i)]=true;
			}
		}
	
		return result;
	}


	KiiSchedule.prototype.expandCron=function(cron,max,offset){
	
		if(offset==null){
			offset=0;
		}
		var result={};
	
		if(cron.match(/\d+-\d+/)){
			//1-3
			var idx=cron.indexOf("-");
		
			var start=Number(cron.substring(0,idx))-offset;
			var end=Number(cron.substring(idx+1))+1-offset;
		
			if(start>end){
				end+=max;
			}
		
			for(var i=start;i<end;i++){
			
				result[String(i%max)]=true;
			}
		
		}else if(cron.match(/\d+\/\d+/)){
			//  0/5
			var idx=cron.indexOf("/");
		
			var start=Number(cron.substring(0,idx))-offset;
			var period=Number(cron.substring(idx+1));
		
			for(var i=start;i<max;i+=period){
			
				result[String(i)]=true;
			}
		
		}else if (cron.match(/([\d+]+,)+/)){
			//1,3,5
			var array=cron.split(",");
		
			for(var i in  array){
				var v=Number(array[i])-offset;
				if(v<max){
					result[String(v)]=true;
				}
			}
		}else if(cron.match(/\d/)){
			result[String(Number(cron)-offset)]=true;
		}
	
		return result;
	
	}
	
	
	return KiiSchedule;
	
	
})();


//=================================================
//ip info
//=================================================

var IPInfo =  (function(){

     function IPInfo(ipAddress,adminCtx){
      		this.ipAddress=ipAddress;
      		this.adminCtx=adminCtx;
     }

     IPInfo.prototype.fillGeoInfo=function(callback){

                 $.getJSON("http://www.geoplugin.net/json.gp?ip="+this.ipAddress,
                        function (data) {
                            var geo={};
//                            geo["city"cit]="foo";
                            geo["city"]=data["geoplugin_city"];
                            geo["region"]=data["geoplugin_region"];
                            geo["countryCode"]=data["geoplugin_countryCode"];
                            geo["countryName"]=data["geoplugin_countryName"];
                            geo["point"]=KiiGeoPoint.geoPoint(data["geoplugin_latitude"], data["geoplugin_longitude"]);
                            callback(geo);

                        }
                    );

         }

     IPInfo.prototype.getGeoInfo=function(callback){
        var bucket =this.adminCtx.bucketWithName("ipAddressInfo");
        var info=bucket.createObjectWithID(this.ipAddress);

        var _this=this;
        info.refresh({
            success:function(obj){
                if(obj.get("isResolve")==true){
                    callback({"geoInfo":obj.get("geoInfo")})
                }else{
                    callback({});
                }
            },
            failure:function(){
                info.set("isResolve",false);
                info.set("_id",_this.ipAddress);

                info.saveAllFields({
                    success:function(){
                        callback({});
                    },
                    failure:function(theObject, anErrorString){
                        callback({});
                    }
                });
            }
        });
     }



    return IPInfo;


})();


//=====================================
//mq
//=====================================


var  MsgQueue = (function(){

    function MsgQueue(done,adminCtx){
        this.done=done;
        this.adminCtx=adminCtx;
    }


    MsgQueue.prototype.initServiceInfo=function(callback){


         var appInfo=this.adminCtx.bucketWithName("ServerInfoList");

         var _this=this;

         var query=KiiQuery.queryWithClause(null);

         appInfo.executeQuery(query,{
                success: function(queryPerformed, resultSet, nextQuery) {
                    _this.services={};

                    for(var i in resultSet){
                        var info=resultSet[i];
                        if(info.getUUID()!=Kii.getAppID()){
                            _this.services[info.getUUID()]=info;
                        }
                    }
                    callback();
                },

                failure: function(queryPerformed, anErrorString) {
                    recordLog(anErrorString,_this.done,"get server list fail",_this.adminCtx);
                }

         });
    }


    MsgQueue.prototype.sendNotifyToAll=function(msg,callback){

        var _this=this;
        var reduce=function(list){
            var k=list.pop();
            if(k==undefined){

                callback();
                return;
            }

            _this.sendNotify(msg,function(){
                reduce(list);
            },k);
        }

        var l=Object.keys(this.services);
        reduce(l);
    }


    MsgQueue.prototype.sendNotify=function(msg,callback,targetID){


            var _this=this;
            var queue=this.adminCtx.bucketWithName("MQTaskQueue");

            var newObj=queue.createObject();
            newObj.set("msg",msg);
            newObj.set("targetID",targetID);
            newObj.set("status","wait");


            newObj.save({
                success:function(){
                    callback();
                },
                failure:function(anErrorString){
                     recordLog(anErrorString,_this.done,"add mq task to queue fail",_this.adminCtx);
                }
             });
    }

    MsgQueue.prototype.onExecuteTask=function(callback){

               var _this=this;
               var queue=this.adminCtx.bucketWithName("MQTaskQueue");

               var clause=KiiClause.equals("status","wait");

               var query=KiiQuery.queryWithClause(clause);

               var reduce=function(list){

                  var task=list.pop();
                  if(task==undefined){
                     callback();
                     return;
                  }
                  _this.sendNotifyExecute(task,function(){
                     reduce(list);
                  });

               }

               var taskList=[];
               var queryCallbacks={

                    success:function(queryPerformed,resultSet,nextQuery){


                       for(var i=0; i<resultSet.length; i++) {
                            taskList.push(resultSet[i]);
                       }

                       if(nextQuery != null) {
                            bucket.executeQuery(nextQuery, queryCallbacks);
                       }else{
                            reduce(taskList);
                       }
                    },
                    failure: function(queryPerformed, anErrorString) {
                        recordLog(anErrorString,_this.done,"get task queue fail",_this.adminCtx);
                    }
               };

               queue.executeQuery(query,queryCallbacks);


    }



    MsgQueue.prototype.sendNotifyExecute=function(task,callback){


           var appID=task.get("targetID");

           var obj=this.services[appID];

           var request=new RemoteKiiRequest(obj);


           var recFun=function(result,error){

                task.set("status",result);
                task.set("errorInfo",error);

                task.saveAllFields({

                     success:function(anything, textStatus){

                          callback();
                     },
                     failure:function(err){
                          callback();
                     }
                });
           }
           request.execute(task.get("msg"),{
                    success:function(anything, textStatus){

                        recFun("success");
                    },
                    failure:function(err){
                        recFun("failure",err);
                    }
                 });

    }

    MsgQueue.prototype.thingAddMsg=function(thingID,model,callback){

        var msg={};
        msg.type="thingAdd";
        msg.thingID=thingID;
        msg.model=model;
        msg.appID=Kii.getAppID();
        var _this=this;
        this.initServiceInfo(
            function(){
                _this.sendNotifyToAll(msg,callback);
            }
        )
    }


    MsgQueue.prototype.thingMoveMsg=function(thingID,callback){

        var msg={};
        msg.type="thingMove";
        msg.thingID=thingID;
        msg.appID=Kii.getAppID();
        var _this=this;

        this.initServiceInfo(
            function(){
                _this.sendNotifyToAll(msg,callback);
            }
        )
    }


    MsgQueue.prototype.thingUpdate=function(thingID,geoInfo,version,callback){

        var msg={};
        msg.type="statusUpdate";
        msg.thingID=thingID;
        if(geoInfo!=undefined){
            msg.geoInfo=geoInfo;
        }
        if(version!=undefined){
            msg.firmwareVersion=version;
        }
        var _this=this;

        this.initServiceInfo(
                    function(){
                        _this.sendNotifyToAll(msg,callback);
                    }
        )
    }

    MsgQueue.prototype.thingDel=function(param,callback){


        var msg={};
        msg.type="thingDel";
        msg.thingID=param.thingID;
        msg.pwd=param.pwd;

        var _this=this;
//        this.sendNotify(msg,callback(thing),param.appID);
        this.initServiceInfo(
                    function(){
                        _this.sendNotify(msg,callback,param.appID);
                    }
        )
    }



    MsgQueue.prototype.deleteList=function(param,callback){

        var msg={};
        msg.type="deleteList";
        msg.appID=param.appID;
        var _this=this;

        this.initServiceInfo(
                    function(){
                        _this.sendNotifyToAll(msg,callback);
                    }
        )    }

    MsgQueue.prototype.addList=function(param,callback){
        var msg={};
        msg.type="addList";
        var list=[];
        for(var k in param){
            var p=param[k];
            list.push(p._customInfo);
        }
        msg.objList=list;
        var _this=this;

        this.initServiceInfo(
                    function(){
                        _this.sendNotifyToAll(msg,callback);
                    }
        )
    }



    return MsgQueue;

})();

//=====================================
//enterpoint
//=====================================

function onLampAdded(params,context,done){
	
	KiiUser.authenticateWithToken(context.getAccessToken(),
	 {
		success:function(){
			var userID=params.objectScope.userID;
			var user=context.getAppAdminContext().userWithID(userID);
			var action = new FireAction(user,done,context.getAppAdminContext());

			var thing=KiiObject.objectWithURI(params.uri);
			thing.refresh({
				success:function(obj){
                    var callback=function(th){
				        finish(done);
                    }
					action.registThing(obj,callback);
				},
				failure:function(obj,err){
					recordLog(err,done,"get_thing_obj_failure");
				}
			});	
		},
		failure:function(){
			recordLog(context,done,"login_failure");
		}
	});
	
}

function migrateLamp(params,context,done){

    var thingID=params.thingID;

    var thing=new MyThing(thingID,done,context.getAppAdminContext());

    //TODO:verify the admin pwd on remote.

    thing.loadThingInfo(function(th){

        var appID=th.get("remote");

        var mq=new MsgQueue(done,context.getAppAdminContext());

        params.appID=appID;
        mq.thingDel(params,function(thingData){

            thing.addThing(thingData,function(){
                var p={};
                p.remote="";
                thing.updateThingInfo(p,function(){
                     mq.thingMoveMsg(thingID,function(){
				            finish(done);
                     });
                })
            });
        });
    });


}

function upgradeLamp(params,context,done){

	var token=context.getAccessToken();

	KiiUser.authenticateWithToken(token, {
		success:function(user){
            var result={};
            result.lights={};

			var act=params.action;

			var lights=params.lights;

			var oper=function(ls){
				var ks=Object.keys(ls);
				if(ks.length==0){
				    finish(done,result);
					return;
				}
				var thingID=ks.pop();
				var pwd=ls[thingID];
				delete ls[thingID];

				var thing=new MyThing(thingID,done,context.getAppAdminContext());
				thing.lightPwd=false;

				var callback=function(){
					result.lights[thingID]=0;
					oper(ls);
				}
				var fail=function(){
				    result.lights[thingID]=1;
                	oper(ls);
				}

				thing.bindThing(function(){

    				thing.doAction({"action":act},user.getID(),"firmwareUpgrade",callback,fail);
		    	},fail);
			}

			oper(lights);
		},
		failure:function(error){
			recordLog(error,done,"loggin_failure")
		}
	});


}

function fireLamp(params,context,done){
	
	var token=context.getAccessToken();
	
	KiiUser.authenticateWithToken(token, {
		success:function(user){
			
			if(typeof(params.verify)!="undefined"){
				
				verifyPermiss(params.lights,done,function(result){
					finish(done,{"lights":result,"verify":{}});
				},context.getAppAdminContext());
				return;
			}

			var act=params.action;

            var lights=params.lights;

            var result={};
            result.lights={};

			var oper=function(ls){
				var ks=Object.keys(ls);
				if(ks.length==0){
					finish(done,result);
					return;
				}
				var thingID=ks.pop();
				var pwd=ls[thingID];
				delete ls[thingID];

				var thing=new MyThing(thingID,done,context.getAppAdminContext());
                thing.lightPwd=pwd;
				var callback=function(){
				    result.lights[thingID]=0;
					oper(ls);
				}
				thing.bindThing(function(){

				    thing.doAction({"action":act},user.getID(),"command",callback,function(){
				        result.lights[thingID]=1;
				        oper(ls);
				    });
				},function(err){
				    result.lights[thingID]=0;
				    oper(ls);
				});
			};
			oper(lights);
		},
		failure:function(error){
			recordLog(error,done,"loggin_failure")
		}
	});
	
}



function verifyPermiss(lights,done,callback,adminCtx){
	
	var result={};
			
	var oper=function(ls){
		var ks=Object.keys(ls);
		if(ks.length==0){
			callback(result);
			return;
		}
		var thingID=ks.pop();
		var pwd=ls[thingID];
		delete ls[thingID];
				
		var thing=new MyThing(thingID,done,adminCtx);
		thing.bindThing(function(thingInfo){
			var thePwd=thingInfo.fields["remotePwd"];
			result[thingID]=(pwd==thePwd)?0:1;
			oper(lights);
		},function(err){
		    result[thingID]=1;
		    oper(lights);
		});
				
	}
			
	return oper(lights);
}

function batchChangeThingPwd(params,context,done){
	var thingIDs=params["thingID"];
	var adminPwd=params.adminPwd;
	var newAdminPwd=params.newAdminPwd;
	var newRemotePwd=params.newRemotePwd;
	
	var result={};
	var adminCtx=context.getAppAdminContext();
	
	var reduct=function(thList){
		
		if(thList.length==0){
			finish(done,result);
			return;
		}
		
		var thingID=thList.pop();
		var thing=new MyThing(thingID,done,adminCtx);
		thing.bindThing(function(th){
		    thing.savePwd(newAdminPwd,newRemotePwd,function(sign){
			    result[thingID]=sign;
			    reduct(thList);
		    },adminPwd);
		},function(err){
		    result[thingID]=false;
		    reduct(thList);
		});
	}
	
	reduct(thingIDs);
	
}

function doChangeThingPwd(params,context,done){
	
	var token=context.getAccessToken();
	var adminCtx=context.getAppAdminContext();
	
	KiiUser.authenticateWithToken(token, {
		success:function(user){
			var thingID=params["thingID"];
			var thing=new MyThing(thingID,done,adminCtx);
			var adminPwd=params["adminPwd"];

            var newAdminPwd=params["newAdminPwd"];
            var newRemotePwd=params["newRemotePwd"];

            thing.bindThing(function(){
                thing.savePwd(newAdminPwd,newRemotePwd,function(sign){
            		finish(done);
                },adminPwd);
            });
		},
		failure:function(error){
			recordLog(error,done,"loggin_with_token_failure",context.getAppAdminContext());
		}
	});
}

//===================
//maintain lamp status
//====================

function doActionResponse(params,context,done){
	
	var adminCtx=context.getAppAdminContext();
	
	var thing=new MyThing(params["thingID"],done,adminCtx);

	var requestID=params["requestID"];
	delete params["requestID"];
	delete params["thingID"];
	
	var fun=function(){
		thing.recordAction(params,
			function(response){
				thing.recordControlLog(response,requestID,function(){
					finish(done);
				});
			}
		);
	};

    thing.bindThing(function(){
        if(params["password"]!=undefined){
            var pwd=params["password"];
            delete params["password"];
            var pwdParam={};
            pwdParam["adminPwd"]=pwd;
            pwdParam["remotePwd"]="1234";
            thing.saveThingProp(pwdParam,fun);
        }else if(params["ipAddress"]!=undefined){
            var ipInfo=new IPInfo(params["ipAddress"],context.getAppAdminContext());
            ipInfo.getGeoInfo(function(geoInfo){
                params["geoInfo"]=geoInfo;
                fun();
            });
        }else{
            fun();
        }
	});
}



function convert(ipInfoList,done,adminCtx){

        if(ipInfoList.length==0){
            finish(done);
            return;
        }
        var ipInfo=ipInfoList.pop();
        var ipAddress=ipInfo.getUUID();

        if(ipAddress==undefined){
            convert(ipInfoList,done,adminCtx);
            return;
        }

        var info=new IPInfo(ipAddress,adminCtx);


        info.fillGeoInfo(function(geo){
//
            if(geo["city"]!=undefined){

                ipInfo.set("geoInfo",geo);
                ipInfo.set("isResolve",true);

                ipInfo.save({
                    success:function(){
                        convert(ipInfoList,done,adminCtx);
                    },
                    failure:function(){
                        convert(ipInfoList,done,adminCtx);
                    }
                })
            }else{
                convert(ipInfoList,done,adminCtx);
            }
        });

}


function  onEveryScanIpInfo(params,context,done){
	var bucket=context.getAppAdminContext().bucketWithName("ipAddressInfo");

    var clause=KiiClause.equals("isResolve",false);
    var query=KiiQuery.queryWithClause(clause);
    query.sortByAsc("_created");
    query.setLimit(100);

    bucket.executeQuery(query,{
       success: function(queryPerformed, resultSet, nextQuery) {
          convert(resultSet,done,"success",context.getAppAdminContext());
       },
       failure: function(queryPerformed, anErrorString) {
          recordLog(anErrorString,done,"Query ipInfo fail",context.getAppAdminContext());
       }
    });

}

//=============================
//thing utils
//=============================

function removeLamp(params,context,done){
	var thingID=params.thingID;
	
	var thing=new MyThing(thingID,done,context.getAppAdminContext());

	thing.bindThing(function(){
	    thing.clearThing(function(){
		    finish(done);
	    });
	});
}

function getThingDetail(params,context,done){
	var thingID=params.thingID;
	
	var thing=new MyThing(thingID,done,context.getAppAdminContext());

	thing.bindThing(function(th){
	     var fields=th.fields;
        thing.getSubscribe("LEDControl",function(sub){
                if(sub==false){
                    finish(done,fields);
                    return;
                }
                fields["subscribe"]=sub;
                var ctrlBucket=th.bucketWithName("LEDControl");
                var acl=ctrlBucket.acl();
                acl.listACLEntries({
                    success:function(acl,entry){
                        fields["acl"]=entry;
                        finish(done,fields);
                    },
                    failure:function(acl,err){
                        finish(done,fields);
                    }
                });
        });
	});
}

function unbindThing(params,context,done){
	
	var thingID=params.thingID;
	
	KiiUser.authenticateWithToken(context.getAccessToken(),{
		success:function(user){
			var actionFire=new FireAction(user,done,context.getAppAdminContext());
			actionFire.removeThingBind(thingID,function(){
                 finish(done);
			});
		},
		failure:function(){
			recordLog(context,done,"loggin_with_token_failure",context.getAppAdminContext());
		}
	});
	
}


//====================
//schedule logic
//=====================
function onScheduleAdd(params,context,done){
	
	KiiUser.authenticateWithToken(context.getAccessToken(),
	{
		success:function(){
			var userID=params.objectScope.userID;
			var schedule=new  KiiSchedule(userID,done,context.getAppAdminContext());
	
			var sched=KiiObject.objectWithURI(params.uri)
			sched.refresh({
				success:function(obj){
					var newObj=schedule.expandLightSch(obj);
					schedule.operateSchedule(newObj,obj.getUUID());
				},
				failure:function(obj,err){
					recordLog(err,done,"get_schedule_obj_failure");
				}
			});	
		},
		failure:function(){
			recordLog(context,done,"loggin_with_token_failure",context.getAppAdminContext());
		}
	});
}

function onScheduleUpate(params,context,done){
	
	KiiUser.authenticateWithToken(context.getAccessToken(),
	{
		success:function(){
			var userID=params.objectScope.userID;
			var schedule=new  KiiSchedule(userID,done,context.getAppAdminContext());
	
			var sched=KiiObject.objectWithURI(params.uri)
			sched.refresh({
				success:function(obj){
					if(obj.get("deleted")==1 ){
						schedule.removeSchedule(obj.getUUID());
					}else{
						var newObj=schedule.expandLightSch(obj);
						schedule.operateSchedule(newObj,obj.getUUID());
					}
				},
				failure:function(obj,err){
					recordLog(err,done,"get_schedule_obj_failure");
				}
			});	
		},
		failure:function(){
			recordLog(context,done,"loggin_with_token_failure",context.getAppAdminContext());
		}
	});
}

function onEveryMinute(params,context,done){
	var time=new Date();
	
	var newParam={"timestamp":time};
	
	fireBySchedula(newParam,context,done);

	
}


function fireBySchedula(params, context, done){
	
	var time=params.timestamp;
	var timestamp=time.getTime();
	
	var min=time.getMinutes();
	var hour=time.getHours();
	var day=time.getDate();
	var month=time.getMonth();
	var week=time.getDay();
	
	 
	var minClause=KiiClause.equals("minutes."+min, true);
	var hourClause=KiiClause.equals("hours."+hour,true);
	
	var dayClause=KiiClause.equals("days."+day,true);
	var monthClause=KiiClause.equals("months."+month,true);
	var weekClause=KiiClause.equals("weeks."+week,true);

	var upperClause=KiiClause.greaterThan("upper", timestamp);
	var lowerClause=KiiClause.lessThanOrEqual("lower", timestamp);

	var enableClause=KiiClause.equals("enable",true);
	var clause=KiiClause.and(
		upperClause,
		lowerClause,
		minClause,
		hourClause,
	 	dayClause,
	 	monthClause,
		weekClause,
		enableClause
	);
	
    var taskList=[];
	
	var bucket=context.getAppAdminContext().bucketWithName("schedule");
	var  callback={
	      success: function(queryPerformed, resultSet, nextQuery) {
		    for(var i=0; i<resultSet.length; i++) {
		  	  	var obj=resultSet[i];
				taskList.push(obj);
		    }

	       if(nextQuery != null) {
	              bucket.executeQuery(nextQuery, callback);
	       }else{
	              fireTask(taskList,done,context.getAppAdminContext());
		    }
	      },
      
	      failure: function(queryPerformed, anErrorString) {
	  		recordLog("query schedule fail",done,anErrorString,context.getAppAdminContext());
	      }
	};
	  
	  
	bucket.executeQuery(KiiQuery.queryWithClause(clause), callback);
    
}


function fireTask(taskList,done,adminContext){
	
   if(taskList.length==0){
		finish(done);
		return;
   }

   var task=taskList.pop();
   
   var user=adminContext.userWithID(task.get("fromUser"));
   
   user.refresh({
	   success:function(u){
		   var actionHelper=new FireAction(u,done,adminContext);
		   actionHelper.schedInfo=task.get("name");

		   actionHelper.fireByCommand(
				task.get("target"),
		   	 	task.get("type"),
		   	 	task.get("action"),
			   function(){
				   fireTask(taskList,done,adminContext);
			   },
			   "command"
		   	);
	   },
	   failure:function(u,err){
		   recordLog(err,done,"get_schedule's from user fail",adminContext);
	   }
   });
   
}


//==========================
//monitor logic
//==========================

function onDaily(params,context,done){

    var time=new Date().getTime();
	var schedule=new  KiiSchedule(null,done,context.getAppAdminContext());

    schedule.removeRetainSchedule(time,function(){
        done();
    });

}

function onSixlyHour(params,context,done){
	
	var time=new Date().getTime();
	
	var param={};
	param["timestamp"]=time;
	
	KiiUser.authenticateWithToken(context.getAccessToken(),
	 {
		success:function(){
			scanUntouchThing(param,context,done);
		},
		failure:function(){
			recordLog(context,done,"loggin_with_token_failure");
		}
	});
	
}

function scanUntouchThing(param,context,done){
    var adminCtx=context.getAppAdminContext();

	var bucket=context.getAppAdminContext().bucketWithName("globalThingInfo");
	var timestamp=param["timestamp"]-1000*60*12;
	
	var clause=KiiClause.lessThan("_modified", timestamp);
	
	
	var sendNotify=function(ts){
		
		if(ts.length==0){
			recordLog("finish scan",done);
			return;
		}
		
		var thingInfo=ts.pop();
		var thing=new MyThing(thingInfo.get("thingID"),done,adminCtx);
		var action={};
        thing.bindThing(function(){
		    thing.doAction(action,"monitor","queryStatus",function(){
			    sendNotify(ts);
		    },function(){
		        sendNotify(ts);
		    });
		},function(){
		    sendNotify(ts);
		});
		
	}
	var things=[];
	
	var getThings=function(queryPerformed, resultSet, nextQuery){
				     for(var i=0; i<resultSet.length; i++) {
						 things.push(resultSet[i]);
				     }
	  			     if(nextQuery != null) {
	                      bucket.executeQuery(nextQuery, getThings);
				     }else{
			     		 sendNotify(things);
				     }
				 };
				 
	bucket.executeQuery(KiiQuery.queryWithClause(clause),
		 {
			 success:getThings,
			 failure:function(json,err){
	  		   recordLog(err,done,"query thingInfo  faile");
			 }
		 });
	
}


//===========================
//mq
//===========================

function onEveryMqTask(params,context,done){

    var mq=new MsgQueue(done,context.getAppAdminContext());

    mq.initServiceInfo(function(){
        mq.onExecuteTask(function(){
            done();
        });
    })

}


function onMsgReceive(params,context,done){

    var type=params.type;

    if(type=="thingAdd"){

        var thingID=params.thingID;

        var thing=new MyThing(thingID,done,context.getAppAdminContext());

        thing.addThingInfo(params.appID,params.model,function(){
              finish(done);
        });

	}else if(type=="thingMove"){
        var thingID=params.thingID;

        var thing=new MyThing(thingID,done,context.getAppAdminContext());

        var p={};
        p.remote=params.appID;
        p.owned={};

        thing.updateThingInfo(p,function(){
            finish(done);
        });


    }else if(type=="thingDel"){
        var thingID=params.thingID;
        var pwd=params.pwd;

        var thing=new MyThing(thingID,done,context.getAppAdminContext());

        thing.bindThing(function(th){
            var adminPwd=th.fields["adminPwd"];

            if(adminPwd==pwd){
                thing.clearThing(function(){
                    finish(done,{"thing":th.fields});
                });
            }else{
                recordLog("pwd:"+pwd,done,"pwd_not_match");
            }
        });

    }else if(type=="statusUpdate"){
           var thingID=params.thingID;

           var thing=new MyThing(thingID,done,context.getAppAdminContext());

           delete params["thingID"];
           delete params["type"];

           var act={};
           act.currAction=params;

           thing.updateThingInfo(act,function(){
                finish(done);
           });
    }else if(type="addList"){

        var appInfo=context.getAppAdminContext().bucketWithName("ServerInfoList");

        var list=params.objList;

        var callback=function(){
            if(list.length==0){
                finish(done);
                return;
            }

            var obj=list.pop();

            operServerList(obj,"add",appInfo,callback,done);
        }

        callback();

    }else if(type=="deleteList"){

        var appInfo=context.getAppAdminContext().bucketWithName("ServerInfoList");

        var callback=function(){
            finish(done);
        }

        operServerList(params,"del",appInfo,callback,done);

    }

}



function maintainServerList(params,context,done){
    var infoBucket=context.getAppAdminContext().bucketWithName("ServerInfoList");

    if(params.oper=="add"){

        var addCallback=function(){

            infoBucket.executeQuery(KiiQuery.queryWithClause(null), {
                    success:function(queryPerformed, resultSet, nextQuery){
                         var queue=new MsgQueue(done,context.getAppAdminContext());
                         squeue.addList(resultSet,function(){
                           finish(done);
                         });
                    },
                    failure:function(){
                        console.log("get info fail");
                    }
            });
        };
        operServerList(params,"add",infoBucket,addCallback,done);
    }else{
        var callback=function(obj){
             var queue=new MsgQueue(done,context.getAppAdminContext());
             queue.deleteList(params,function(){
                finish(done);
             });
        }
        operServerList(params,"del",infoBucket,callback,done);
    }

}

function operServerList(param,oper,infoBucket,callback,done){

        var entity=infoBucket.createObjectWithID(param.appID);

        entity.set("appKey",param.appKey);
        entity.set("appID",param.appID);
        entity.set("site",param.site);

        if(oper=="add"){
          entity.saveAllFields({
            success:callback,
            failure:function(obj,err){
             recordLog(err,done,"modify maintain server info failure");
            }
          });
        }else{
          entity.refresh({
            success:function(obj){
                   entity.delete({
                    success:callback,
                    failure:function(obj,err){
                      recordLog(err,done,"delete maintain server info failure");
                    }
                   })
            },
            failure:function(obj,err){
                recordLog(err,done,"get server info fail");
            }
          });
        }
}