package com.kii.extension.portal.service;

import javax.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpRequest;
import org.springframework.stereotype.Component;

import com.kii.extension.portal.store.AppInfoStore;
import com.kii.extension.portal.store.AppStoreBind;
import com.kii.extension.portal.web.PortalWebException;
import com.kii.extension.sdk.entity.LoginInfo;
import com.kii.extension.sdk.service.KiiCloudService;

@Component
public class TokenManager {

	@Autowired
	private KiiCloudService kiicloudService;

	@Autowired
	private AppStoreBind appBind;

	@Autowired
	private AppInfoStore store;



	private Map<String,TokenInfo> tokenMap=new ConcurrentHashMap<>();

	public static final long ttl=6*60*1000;

	private static class TokenInfo{

		private final long timestamp=System.currentTimeMillis();

		private final String name;
		public TokenInfo(String name){
			this.name=name;
		}

		public boolean verify(){

			long validPeriod=System.currentTimeMillis()-ttl;

			return timestamp>=validPeriod;
		}

	}

	public String getNewToken(String name){

		String seed=UUID.randomUUID().toString();

		tokenMap.put(seed,new TokenInfo(name));
		return seed;
	}

	public String verifyToken(String header){

		String token=header.substring(header.lastIndexOf(" ")+1);

		token=token.trim();


		TokenInfo info=tokenMap.get(token);
		if(info==null||!info.verify()){
			return null;
		}

		String userName=info.name;

		if(userName==null||!userName.equals(store.getAdminName())){
			throw new PortalWebException();
		}


		return info.name;

	}


	public String verifyToken(HttpServletRequest request){

		String authStr=request.getHeader("Authorization");

		return verifyToken(authStr);
	}


	private Map<String,LoginInfo> adminTokenMap=new HashMap<>();

	public String getAdminToken(String alias){


		return adminTokenMap.getOrDefault(alias,login(alias)).getToken();

	}

	private LoginInfo login(String alias){

		appBind.choiceAppInfo(alias);

		return kiicloudService.adminLogin();

	}


}
