package com.kii.extension.portal.store;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.kii.extension.sdk.entity.AppInfo;
import com.kii.extension.sdk.service.AppBindTool;

@Component
public class AppStoreBind implements AppBindTool {

	@Autowired
	private AppInfoStore store;

	@Override
	public AppInfo getAppInfo() {
		return store.getAppInfo(aliasLocate.get());
	}

	private ThreadLocal<String> aliasLocate=new ThreadLocal<>();



	public void  choiceAppInfo(String index) {
		aliasLocate.set(index);
	}
}
