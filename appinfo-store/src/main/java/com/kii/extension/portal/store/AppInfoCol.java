package com.kii.extension.portal.store;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

import com.kii.extension.sdk.entity.AppInfo;

public class AppInfoCol implements Serializable {

	private static final String DEFAULT = "default_alias";


	private Map<String,AppInfo> appInfoMap=new HashMap<>();

	private String adminName;

	private String adminPassword;

	public AppInfo getAppInfoByAlias(String alias){

		return appInfoMap.get(alias);
	}


	public void addAppInfo(String alias,AppInfo appInfo){

//		appInfo.setAppAlias(alias);
		appInfoMap.put(alias,appInfo);

	}


	public AppInfo getDefaultInfo(){
		return appInfoMap.get(DEFAULT);
	}

	public void setDefaultInfo(AppInfo appInfo){
		appInfoMap.put(DEFAULT,appInfo);
	}

	public Map<String, AppInfo> getAppInfoMap() {
		return appInfoMap;
	}

	public void setAppInfoMap(Map<String, AppInfo> appInfoMap) {
		this.appInfoMap = appInfoMap;
	}

	public String getAdminName() {
		return adminName;
	}

	public void setAdminName(String adminName) {
		this.adminName = adminName;
	}

	public String getAdminPassword() {
		return adminPassword;
	}

	public void setAdminPassword(String adminPassword) {
		this.adminPassword = adminPassword;
	}
}
