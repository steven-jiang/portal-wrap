
MyRequest = (function(){
	
	function MyRequest(path){
	    this._path = "/apps/" + (Kii.getAppID()) +"/"+ path;
		
	    this._method = "GET";
	    this._headers = {
	      "accept": "*/*"
	    };
	    this._success = function(json, status) {
			recordLog("kii request","success:"+json+" \n status:"+status);
		};
	    this._failure = function(errString, status) {
			recordLog("kii request","failure:"+errString+" \n status:"+status);
    	
	    };
	
		var _this=this;
	    
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
	            var json = JSON.parse(decodeURIComponent(jqXHR.responseText));
	            if (json.errorCode != null) {
	                errString = json.errorCode+json.message;
	             }
	             return _this._failure(errString, textStatus);
	       }
	    };
		
		this.onError=function(jqXHR,textStatus,errorThrown){
            var errString = textStatus + " : "  + _this._path;
            var json = JSON.parse(decodeURIComponent(jqXHR.responseText));
            if (json != null) {
              if (json.errorCode != null) {
                  errString = json.errorCode;
                if (json.message != null) {
                  errString += ": " + json.message;
                }
              }
            }
            return _this._failure(errString, textStatus);
       };
	   
   	}
	
	MyRequest.prototype.execute=function(callback){
		
		if(callback!=null){
			if(callback["success"]!=null){
				this._success=callback["success"];
			}
			if((callback["failure"]!=null)){
				this._failure=callback["failure"];
			}
			if(typeof(callback)=="function"){
			    this._success=callback;
			}
		}

	    var url = Kii.getBaseURL() + this._path;
		if(this._sub_path!=null){
			url+="/"+this._sub_path;
			delete this._sub_path;
		};

		if(this.full_url!=undefined){
		    url=this.full_url;
		}
	
		var json_text=null;
		if(this._data!=null){
		    json_text = JSON.stringify(this._data);
		}
		this._data=null;
		
	    this._headers['x-kii-appid'] = Kii.getAppID();
	    this._headers['x-kii-appkey'] = Kii.getAppKey();
	    this._headers['x-kii-sdk'] = KiiSDKClientInfo.getSDKClientInfo();
	
	    if (this._accept != null) {
	      this._headers['accept'] = this._accept;
	    }
		if(this._token!=null){
  	      this._headers['Authorization'] = "Bearer " + this._token;
		  delete this._token;
	    }
	
	    if (this._contentType != null) {
	      this._headers['Content-Type'] = this._contentType;
	    }else{
			this._headers['Content-Type']= "application/json";
	    }
		delete this._contentType;
		
		var ajaxParam={};
		ajaxParam["contextType"]=this._contextType;
		ajaxParam["type"]=this._method;
		ajaxParam["success"]=this.onSuccess;
		ajaxParam["error"]=this.onError;
		if(json_text!=null){
			ajaxParam["data"]=json_text;
		}
		ajaxParam["headers"]=this._headers;
	
		$.ajax(url,ajaxParam);
		
	}
	return MyRequest;
})();


Context= (function(){

    Context.done=function(param){
            console.log("return:"+JSON.stringify(param));
            if(typeof(oldUser)!="undefined"){
               Kii.setCurrentUser(oldUser);
               delete oldUser;
            }

    };
	
	function Context(appID,appKey,url,clientID,secret,callback){
		
		this.appID=appID;
		this.appKey=appKey;
		this.secret=secret;
		this.clientID=clientID;

		Kii.initializeWithSite(appID, appKey, url);
		
		var _this=this;
		Kii.authenticateAsAppAdmin(clientID,secret, {
		    success: function(adminContext) {
				_this.adminCtx=adminContext;
				console.log("finish init");
				callback();
			}
		});
	}

	
	Context.prototype.getAccessToken=function(){
			return this.token;
	}
	
	Context.prototype.getAppAdminContext=function(){
		return this.adminCtx;
	}
	
	Context.prototype.getAppID=function(){
		return this.appID;
	}
	
	Context.prototype.getAppKey=function(){
		return this.appKey;
	}
	
	Context.prototype.setUserLogin=function(userName,pwd){
		this.userName=userName;
		this.pwd=pwd;
		this.thing=null;
	}

	Context.prototype.setThingLogin=function(thingID){
	    this.thing=thingID;
	    this.userName=null;
	}


	Context.prototype.runInAdmin=function(callback){
	    		Kii.authenticateAsAppAdmin(this.clientID,this.secret, {
        		    success: function(adminContext) {

        				callback(adminContext);
        			}
        		});
	}
	
	Context.prototype.runInUser=function(callback){
		var _this=this;
		KiiUser.authenticate(this.userName, this.pwd, {
			success:function(user){
				_this.token=user.getAccessToken();
				callback(user);
			},
			failure:function(user,err){
				console.log("user login faile:"+err);
			}
		});
	}

	Context.prototype.runInThing=function(callback){

        var _this=this;
		this.runInAdmin(function(adminCtx){

		    adminCtx.loadThingWithVendorThingID(_this.thing,callback);

		});
	}

	Context.prototype.fireBucketTrigger=function(funName,obj,bucketName){
		
		var _this=this;
		if(this.userName != null){
			this.runInUser(function(user){
				var bucket=user.bucketWithName(bucketName);
			
				var callback={
					success:function(result){
						if(_this.remote==null){
							var param={};
							param.objectScope={};
							param.objectScope.userID=user.getID();
							param.uri=result.objectURI();
							param.objectID=result.getUUID();
							param.bucketID=bucketName;
							var fun=function(param){
								console.log("return:"+JSON.stringify(param));
							}
							eval(funName)(param,_this,fun);
						
						}else{
							return;
						}
					},
					failure:function(){
						
					}
				};
				
				if(obj["_id"]!=undefined){
					var newObj=bucket.createObjectWithID(obj["_id"]);
					for(var k in obj){
						newObj.set(k,obj[k]);
					}
					newObj.saveAllFields(callback);
				}else{
					var newObj=bucket.createObject();
					for(var k in obj){
						newObj.set(k,obj[k]);
					}
					newObj.save(callback);
				}
			});
		}else if(this.thing!=null){
			this.runInThing(function(t){
				var bucket=t.bucketWithName(bucketName);
				var newObj=bucket.createObject();
				for(var k in obj){
					newObj.set(k,obj[k]);
				}
				newObj.save({
					success:function(result){
						if(_this.remote==null){
							var param={};
							param.objectScope={};
							param.objectScope.userID=t._name;
							param.uri=result._getPath();
							param.objectID=result.getUUID();
							param.bucketID=bucketName;
							
							var fun=function(param){
								console.log("return:"+JSON.stringify(param));
							}
							eval(funName)(param,_this,function(){
								fun();
							});
						}else{
							return;
						}
					}
				});
			});
		}
		
	}
	
	Context.prototype.fireFun=function(funName,param,fun){
		
		var _this=this;
		
		if(fun==null){
			fun=function(param){
				console.log("return:"+JSON.stringify(param));
				if(typeof(oldUser)!="undefined"){
					Kii.setCurrentUser(oldUser);
					delete oldUser;
				}
			}
		}
		
		var callback= function(result){
			console.log("return result:"+result);
			if(this.remote!=null){
				var returnVal=response["returnedValue"];
				fun(returnVal);
			}else{
				fun(result);
			}
		};
		
			
		if(this.userName != null){
			KiiUser.authenticate(this.userName, this.pwd, {
				success:function(user){
					_this.token=user.getAccessToken();
					_this.fireRemoteFun(funName,param,fun);
				}
			});
		}else{
			_this.token=_this.adminCtx._token;
			_this.fireRemoteFun(funName,param,fun);
			
		}
		return;
		
	}

	
	Context.prototype.fireRemoteFun=function(funName,param,callback){
		
		
		if(this.remote==null){
			eval(funName)(param,this,callback);
			return;
		}
		
		var request=new MyRequest("server-code/versions/current");
		
		request._sub_path=funName;
		request._data=param;
		request._token=this.token;
		request._method="POST";

		request.execute({success:callback});
		
	}
	
	return Context;
	
})();

