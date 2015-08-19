package com.kii.extension.sdk.service;

import org.apache.http.client.methods.HttpUriRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.kii.extension.sdk.entity.AppInfo;
import com.kii.extension.sdk.entity.LoginInfo;
import com.kii.extension.sdk.impl.ApiAccessBuilder;
import com.kii.extension.sdk.impl.KiiCloudClient;

@Component
public class KiiCloudService {

	@Autowired
	private ObjectMapper mapper;

	@Autowired
	private KiiCloudClient client;

	@Autowired
	private AppBindTool bindTool;

	private ApiAccessBuilder getBuilder(){
		AppInfo info= bindTool.getAppInfo();

		return new ApiAccessBuilder(info);
	}

	public LoginInfo login(String user,String pwd){

		HttpUriRequest  request=getBuilder().login(user, pwd).generRequest(mapper);


		return client.executeRequest(request,LoginInfo.class);


	}

	public LoginInfo adminLogin(){


		HttpUriRequest  request=getBuilder().adminLogin(bindTool.getAppInfo().getClientID(), bindTool.getAppInfo().getClientSecret()).generRequest(mapper);


		return client.executeRequest(request,LoginInfo.class);

	}


}
